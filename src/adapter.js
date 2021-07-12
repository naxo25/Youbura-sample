/* global bitmovin */
var youbora = require('youboralib')
var manifest = require('../manifest.json')

youbora.adapters.Bitmovin = youbora.Adapter.extend({
  getVersion: function () {
    return manifest.version + '-' + manifest.name + '-' + manifest.tech
  },

  getPlayhead: function () {
    return this.playingAds ? this.lastPlayhead : this.player.getCurrentTime()
  },

  getDuration: function () {
    return this.player.getDuration()
  },

  getPlayrate: function () {
    if (this.flags.isPaused) return 0
    if (typeof this.player.getPlaybackSpeed() !== 'undefined') {
      return this.player.getPlaybackSpeed()
    }
    return 1
  },

  getDroppedFrames: function () {
    return this.player.getDroppedFrames()
  },

  getBitrate: function () {
    if (this.player.getPlaybackVideoData && this.player.getPlaybackVideoData() &&
            this.player.getPlaybackVideoData().bitrate) {
      return this.player.getPlaybackVideoData().bitrate
    } else {
      return -1
    }
  },

  getRendition: function () {
    if (this.player.getPlaybackVideoData && this.player.getPlaybackVideoData()) {
      var playbackValues = this.player.getPlaybackVideoData()
      if (playbackValues.bitrate) {
        if (playbackValues.width && playbackValues.height) {
          return youbora.Util.buildRenditionString(playbackValues.width, playbackValues.height, playbackValues.bitrate)
        }
        return playbackValues.bitrate
      }
      return this.player.getPlaybackVideoData().id
    }
    return -1
  },

  getIsLive: function () {
    return this.player.isLive()
  },

  getResource: function () {
    if (this.player.getConfig) {
      var sourceObject = this.player.getConfig().source
      if (sourceObject) {
        return sourceObject.dash || sourceObject.hls || sourceObject.progressive
      }
    }
    return 'unknown'
  },

  getPlayerName: function () {
    return 'Bitmovin'
  },

  getPlayerVersion: function () {
    return bitmovin.player.version
  },

  registerListeners: function () {
    this.monitorPlayhead(true, true)

    var EVENT = this.player.EVENT || bitmovin.player.EVENT
    this.references = {}
    this.references[EVENT.ON_ERROR] = this.errorListener.bind(this)
    this.references[EVENT.ON_PAUSED] = this.pauseListener.bind(this)
    this.references[EVENT.ON_PLAY] = this.playListener.bind(this)
    this.references[EVENT.ON_PLAYING] = this.playingListener.bind(this)
    this.references[EVENT.ON_PLAYBACK_FINISHED] = this.endedListener.bind(this)
    this.references[EVENT.ON_SEEK] = this.seekingListener.bind(this)
    this.references[EVENT.ON_SEEKED] = this.seekedListener.bind(this)
    this.references[EVENT.ON_SEGMENT_PLAYBACK] = this.joinListener.bind(this)
    this.references[EVENT.ON_SOURCE_UNLOADED] = this.endedListener.bind(this)
    this.references[EVENT.ON_STOP_BUFFERING] = this.joinListener.bind(this)
    this.references[EVENT.ON_TIME_CHANGED] = this.joinChangedListener.bind(this)
    this.references[EVENT.ON_AD_BREAK_FINISHED] = this.endAdsListener.bind(this)
    this.references[EVENT.ON_AD_BREAK_STARTED] = this.startAdsListener.bind(this)
    for (var key in this.references) {
      this.player.addEventHandler(key, this.references[key])
    }
  },

  /** Unregister listeners to this.player. */
  unregisterListeners: function () {
    // Disable playhead monitoring
    if (this.monitor) this.monitor.stop()

    // unregister listeners
    if (this.player && this.references) {
      for (var key in this.references) {
        this.player.removeEventHandler(key, this.references[key])
        delete this.references[key]
      }
    }
  },

  /** Listener for 'ON_PLAY' event. */
  playListener: function (e) {
    if (!this.plugin.getAdsAdapter()) this.plugin.setAdsAdapter(new youbora.adapters.Bitmovin.NativeAdsAdapter(this.player))
    this.fireStart()
    this.fireResume()
  },

  /** Listener for 'ON_SEGMENT_PLAYBACK' and 'ON_STOP_BUFFERING' events. */
  joinListener: function (e) {
    this.fireJoin()
  },

  /** Listener for 'ON_PAUSED' event. */
  pauseListener: function (e) {
    if (!this.flags.isSeeking) this.firePause()
  },

  /** Listener for 'ON_PLAYING' events. */
  playingListener: function (e) {
    this.fireStart()
  },

  /** Listener for 'ON_ERROR' event. */
  errorListener: function (e) {
    this.fireError(e.code, e.message)
    // 200, 303, 403, 404, 405, 900, 901 Advertisement
    // 1000 to 1028 Setup error
    // 2000, 2001, 2002, 3000 to 3047 Error
    // 5000 to 5013 Warning
    if (e.code >= 1000 && e.code <= 4999) {
      this.fireStop()
    }
  },

  /** Listener for 'ON_SEEK' event. */
  seekingListener: function (e) {
    this.fireSeekBegin()
  },

  /** Listener for 'ON_SEEKED' event. */
  seekedListener: function (e) {
    this.monitor.skipNextTick()
  },

  /** Listener for 'ON_PLAYBACK_FINISHED' event. */
  endedListener: function (e) {
    this.fireStop()
  },

  /** Listener for 'ON_TIME_CHANGED' event */
  joinChangedListener: function (e) {
    if (this.getPlayhead() > 0) {
      this.fireStart()
      this.fireJoin()
    }
    this.lastPlayhead = this.getPlayhead()
  },

  /** Listener for 'ON_AD_BREAK_FINISHED' event */
  endAdsListener: function (e) {
    this.playingAds = false
    this.fireResume()
  },

  /** Listener for 'ON_AD_BREAK_STARTED' event */
  startAdsListener: function (e) {
    this.playingAds = true
    this.firePause()
  }
},
// Static members
{
  NativeAdsAdapter: require('./ads/nativeads')
}
)

module.exports = youbora.adapters.Bitmovin
