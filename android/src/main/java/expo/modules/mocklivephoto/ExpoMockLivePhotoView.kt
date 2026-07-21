package expo.modules.mocklivephoto

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.net.Uri
import android.view.Surface
import android.view.TextureView
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.IOException
import java.util.ArrayDeque

class ExpoMockLivePhotoView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
  TextureView.SurfaceTextureListener {
  private val onVideoReady by EventDispatcher()
  private val onPlaybackStart by EventDispatcher()
  private val onPlaybackEnd by EventDispatcher()
  private val onError by EventDispatcher()

  private val textureView = TextureView(context)
  private val state = PlaybackState()
  private val pendingSeeks = ArrayDeque<ReplayRequest>()
  private var surface: Surface? = null
  private var player: MediaPlayer? = null
  private var videoUri: String? = null
  private var muted = false
  private var resizeMode = "cover"
  private var videoWidth = 0
  private var videoHeight = 0
  private var playbackStartPending = false

  init {
    clipChildren = true
    textureView.surfaceTextureListener = this
    addView(textureView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun setVideoUri(value: String) {
    reset()
    videoUri = value
    createPlayerIfReady()
  }

  fun setMuted(value: Boolean) {
    muted = value
    setPlayerVolume()
  }

  fun setResizeMode(value: String) {
    resizeMode = if (value == "contain") "contain" else "cover"
    updateTransform()
  }

  fun play() {
    val currentPlayer = player ?: return fail("PLAYBACK_ERROR", "No video is loaded", state.version)
    if (!canPlay() || playbackStartPending) return

    playbackStartPending = true
    if (state.phase == PlaybackPhase.Ended) {
      val version = state.version
      val token = state.requestReplay(version) ?: run {
        playbackStartPending = false
        return
      }
      val request = ReplayRequest(version, token)
      pendingSeeks.addLast(request)
      try {
        currentPlayer.seekTo(0)
      } catch (error: IllegalStateException) {
        pendingSeeks.remove(request)
        fail("PLAYBACK_ERROR", error.message ?: "Unable to restart video", version)
      } catch (error: IllegalArgumentException) {
        pendingSeeks.remove(request)
        fail("PLAYBACK_ERROR", error.message ?: "Unable to restart video", version)
      } catch (error: SecurityException) {
        pendingSeeks.remove(request)
        fail("PLAYBACK_ERROR", error.message ?: "Unable to restart video", version)
      }
      return
    }
    startPlayer(currentPlayer, state.version)
  }

  fun pause() {
    val wasPlaying = state.phase == PlaybackPhase.Playing
    playbackStartPending = false
    state.reduce(PlaybackState.Event.Pause)
    if (!wasPlaying) return
    try {
      player?.pause()
    } catch (error: IllegalStateException) {
      fail("PLAYBACK_ERROR", error.message ?: "Unable to pause video", state.version)
    } catch (error: SecurityException) {
      fail("PLAYBACK_ERROR", error.message ?: "Unable to pause video", state.version)
    }
  }

  fun reset() {
    state.reduce(PlaybackState.Event.Reset)
    playbackStartPending = false
    pendingSeeks.clear()
    videoUri = null
    videoWidth = 0
    videoHeight = 0
    releasePlayer(reportError = isAttachedToWindow)
    updateTransform()
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    if (visibility != View.VISIBLE) pause()
  }

  override fun onDetachedFromWindow() {
    textureView.surfaceTextureListener = null
    reset()
    surface?.release()
    surface = null
    super.onDetachedFromWindow()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    updateTransform()
  }

  override fun onSurfaceTextureAvailable(texture: SurfaceTexture, width: Int, height: Int) {
    surface?.release()
    surface = Surface(texture)
    createPlayerIfReady()
  }

  override fun onSurfaceTextureSizeChanged(texture: SurfaceTexture, width: Int, height: Int) {
    updateTransform()
  }

  override fun onSurfaceTextureDestroyed(texture: SurfaceTexture): Boolean {
    state.reduce(PlaybackState.Event.Reset)
    playbackStartPending = false
    pendingSeeks.clear()
    releasePlayer(reportError = false)
    surface?.release()
    surface = null
    return true
  }

  override fun onSurfaceTextureUpdated(texture: SurfaceTexture) = Unit

  private fun createPlayerIfReady() {
    val uri = videoUri ?: return
    val currentSurface = surface ?: return
    val version = state.version
    val newPlayer = MediaPlayer()
    player = newPlayer
    try {
      newPlayer.setDataSource(context, Uri.parse(uri))
      newPlayer.setSurface(currentSurface)
      newPlayer.isLooping = false
      newPlayer.setVolume(if (muted) 0f else 1f, if (muted) 0f else 1f)
      newPlayer.setOnPreparedListener { prepared ->
        if (!isCurrent(prepared, version)) return@setOnPreparedListener
        videoWidth = prepared.videoWidth
        videoHeight = prepared.videoHeight
        updateTransform()
        val previous = state.phase
        state.reduce(PlaybackState.Event.Ready(version))
        if (previous == PlaybackPhase.Idle && state.phase == PlaybackPhase.Ready) onVideoReady(emptyMap())
      }
      newPlayer.setOnVideoSizeChangedListener { changedPlayer, width, height ->
        if (!isCurrent(changedPlayer, version)) return@setOnVideoSizeChangedListener
        videoWidth = width
        videoHeight = height
        updateTransform()
      }
      newPlayer.setOnCompletionListener { completed ->
        if (!isCurrent(completed, version)) return@setOnCompletionListener
        playbackStartPending = false
        val previous = state.phase
        state.reduce(PlaybackState.Event.Ended(version))
        if (previous != PlaybackPhase.Ended && state.phase == PlaybackPhase.Ended) onPlaybackEnd(emptyMap())
      }
      newPlayer.setOnSeekCompleteListener { seekPlayer ->
        val request = pendingSeeks.pollFirst() ?: return@setOnSeekCompleteListener
        if (!isCurrent(seekPlayer, request.version) || !state.consumeReplay(request.version, request.token)) return@setOnSeekCompleteListener
        if (!playbackStartPending) return@setOnSeekCompleteListener
        startPlayer(seekPlayer, request.version)
      }
      newPlayer.setOnErrorListener { failedPlayer, _, _ ->
        if (!isCurrent(failedPlayer, version)) return@setOnErrorListener true
        val code = if (state.phase == PlaybackPhase.Idle) "VIDEO_LOAD_ERROR" else "PLAYBACK_ERROR"
        fail(code, if (code == "VIDEO_LOAD_ERROR") "Unable to load video" else "Playback failed", version)
        true
      }
      newPlayer.prepareAsync()
    } catch (error: IOException) {
      fail("VIDEO_LOAD_ERROR", error.message ?: "Unable to load video", version)
    } catch (error: IllegalArgumentException) {
      fail("VIDEO_LOAD_ERROR", error.message ?: "Invalid video URL", version)
    } catch (error: IllegalStateException) {
      fail("VIDEO_LOAD_ERROR", error.message ?: "Unable to prepare video", version)
    } catch (error: SecurityException) {
      fail("VIDEO_LOAD_ERROR", error.message ?: "Unable to access video", version)
    }
  }

  private fun startPlayer(currentPlayer: MediaPlayer, version: Int) {
    try {
      currentPlayer.start()
      if (!isCurrent(currentPlayer, version) || !currentPlayer.isPlaying) return
      playbackStartPending = false
      val previous = state.phase
      state.reduce(PlaybackState.Event.Started(version))
      if (previous != PlaybackPhase.Playing && state.phase == PlaybackPhase.Playing) onPlaybackStart(emptyMap())
    } catch (error: IllegalStateException) {
      fail("PLAYBACK_ERROR", error.message ?: "Unable to play video", version)
    } catch (error: SecurityException) {
      fail("PLAYBACK_ERROR", error.message ?: "Unable to play video", version)
    }
  }

  private fun setPlayerVolume() {
    try {
      player?.setVolume(if (muted) 0f else 1f, if (muted) 0f else 1f)
    } catch (error: IllegalStateException) {
      fail("PLAYBACK_ERROR", error.message ?: "Unable to update volume", state.version)
    }
  }

  private fun fail(code: String, message: String, version: Int) {
    if (version != state.version) return
    val previous = state.phase
    state.reduce(PlaybackState.Event.Failed(version))
    if (previous == PlaybackPhase.Failed) return
    playbackStartPending = false
    pendingSeeks.clear()
    onError(mapOf("code" to code, "message" to message))
  }

  private fun releasePlayer(reportError: Boolean) {
    val oldPlayer = player ?: return
    player = null
    var errorMessage: String? = null
    try {
      oldPlayer.setOnPreparedListener(null)
      oldPlayer.setOnVideoSizeChangedListener(null)
      oldPlayer.setOnCompletionListener(null)
      oldPlayer.setOnSeekCompleteListener(null)
      oldPlayer.setOnErrorListener(null)
      oldPlayer.setSurface(null)
    } catch (error: IllegalStateException) {
      errorMessage = error.message ?: "Unable to release video"
    } catch (error: SecurityException) {
      errorMessage = error.message ?: "Unable to release video"
    }
    try {
      oldPlayer.release()
    } catch (error: IllegalStateException) {
      errorMessage = errorMessage ?: error.message ?: "Unable to release video"
    } catch (error: SecurityException) {
      errorMessage = errorMessage ?: error.message ?: "Unable to release video"
    }
    if (reportError) errorMessage?.let { onError(mapOf("code" to "PLAYBACK_ERROR", "message" to it)) }
  }

  private fun isCurrent(candidate: MediaPlayer, version: Int) = candidate === player && version == state.version

  private fun canPlay() = when (state.phase) {
    PlaybackPhase.Ready, PlaybackPhase.Paused, PlaybackPhase.Ended -> true
    else -> false
  }

  private fun updateTransform() {
    val viewWidth = textureView.width.toFloat()
    val viewHeight = textureView.height.toFloat()
    if (viewWidth <= 0f || viewHeight <= 0f || videoWidth <= 0 || videoHeight <= 0) {
      textureView.setTransform(null)
      return
    }
    val aspectRatio = (videoWidth.toFloat() / videoHeight) / (viewWidth / viewHeight)
    val scaleX: Float
    val scaleY: Float
    if (resizeMode == "contain") {
      scaleX = if (aspectRatio < 1f) aspectRatio else 1f
      scaleY = if (aspectRatio > 1f) 1f / aspectRatio else 1f
    } else {
      scaleX = if (aspectRatio > 1f) aspectRatio else 1f
      scaleY = if (aspectRatio < 1f) 1f / aspectRatio else 1f
    }
    textureView.setTransform(Matrix().apply { setScale(scaleX, scaleY, viewWidth / 2f, viewHeight / 2f) })
  }

  private data class ReplayRequest(val version: Int, val token: Int)
}
