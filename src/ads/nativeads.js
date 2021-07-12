/* global bitmovin */
var youbora = require('youboralib')
var manifest = require('../../manifest.json')

youbora.adapters.Bitmovin = youbora.Adapter.extend({
  getVersion: function () {
    return manifest.version + '-' + manifest.name + '-' + manifest.tech
  },

  getDuration: function () {
    return this.duration
  },

  getPosition: function () {
    return this.plugin.getAdapter().flags.isJoined ? 'mid' : 'pre'
  },

  registerListeners: function () {
    var EVENT = this.player.EVENT || bitmovin.player.EVENT
    this.references = {}
    this.references[EVENT.ON_AD_CLICKED] = this.clickListener.bind(this)
    this.references[EVENT.ON_AD_ERROR] = this.errorListener.bind(this)
    this.references[EVENT.ON_AD_FINISHED] = this.endListener.bind(this)
    this.references[EVENT.ON_AD_MANIFEST_LOADED] = this.manifestListener.bind(this)
    this.references[EVENT.ON_AD_PLAYBACK_FINISHED] = this.endListener.bind(this)
    this.references[EVENT.ON_AD_SKIPPED] = this.skipListener.bind(this)
    this.references[EVENT.ON_AD_STARTED] = this.joinListener.bind(this)
    this.references[EVENT.ON_AD_BREAK_FINISHED] = this.endListener.bind(this)
    this.references[EVENT.ON_AD_BREAK_STARTED] = this.playListener.bind(this)
    // this.references[EVENT.ON_AD_QUARTILE] = this.quartileListener.bind(this)
    this.references[EVENT.ON_PAUSED] = this.pauseListener.bind(this)
    this.references[EVENT.ON_PLAYING] = this.playingListener.bind(this)
    for (var key in this.references) {
      this.player.addEventHandler(key, this.references[key])
    }
  },

  /** Unregister listeners to this.player. */
  unregisterListeners: function () {
    // unregister listeners
    if (this.player && this.references) {
      for (var key in this.references) {
        this.player.removeEventHandler(key, this.references[key])
        delete this.references[key]
      }
    }
  },

  playListener: function (e) {
    this.fireStart()
    this.fireResume()
  },

  pauseListener: function (e) {
    this.firePause()
  },

  playingListener: function (e) {
    this.fireResume()
  },

  joinListener: function (e) {
    this.duration = e.duration
    this.fireStart()
    this.fireJoin()
  },

  clickListener: function (e) {
    this.fireClick(e.clickThroughUrl)
  },

  endListener: function (e) {
    this.fireStop()
    this.duration = null
  },

  errorListener: function (e) {
    // 200, 303, 403, 404, 405, 900, 901 Advertisement
    if (e.code >= 200 && e.code <= 999) {
      this.fireError(e.code, e.message)
      this.fireStop()
      this.duration = null
    }
  },

  skipListener: function (e) {
    this.fireSkip()
    this.duration = null
  },

  manifestListener: function (e) {
    youbora.Log.error(e)
  }

  /* quartileListener: function (e) {
              var quartileNumber = 1
              if (e.quartile === "midpoint") {
                quartileNumber = 2
              } else if (e.quartile === "thirdQuartile") {
                quartileNumber = 3
              }
              this.fireQuartile(quartileNumber)
            } */

})

module.exports = youbora.adapters.Bitmovin
