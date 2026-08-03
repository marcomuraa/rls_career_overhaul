// Stream Manager Class

export default class {
  streamsRefCnt = {}
  gameAPI = {}
  resubmitDebounceTime = 200 // in ms
  resubmitTimeout = null
  activePlayers = [0] // which player vehicles to subscribe streams for (split-screen)

  constructor(api) {
    this.gameAPI = api
  }

  // set the players whose vehicle streams we want (e.g. [0,1] for 2-way split). Defaults to [0].
  setActivePlayers(players) {
    this.activePlayers = Array.isArray(players) && players.length ? [...new Set(players)] : [0]
    this._updateSubscriptions()
  }

  // C++ does not need to know our internal reference count, so we filter it out here
  _updateSubscriptions() {
    let reqVehStreams = []
    for (let k in this.streamsRefCnt) {
      reqVehStreams.push(k)
    }
    let subscriptions = {
      vehicles: this.activePlayers.map(pid => ({ byPlayerId: pid, streams: reqVehStreams })),
      //globalStreams: [] // TODO:
    }
    this.gameAPI.subscribeToEvents(JSON.stringify(subscriptions))
  }

  add(streams) {
    for (let i = 0; i < streams.length; ++i) {
      let stream = streams[i]
      if (!this.streamsRefCnt[stream]) this.streamsRefCnt[stream] = 0
      this.streamsRefCnt[stream] += 1
    }
    this._updateSubscriptions()
  }

  remove(streams) {
    for (let i = 0; i < streams.length; ++i) {
      let stream = streams[i]
      if (this.streamsRefCnt[stream]) {
        this.streamsRefCnt[stream] -= 1
        if (this.streamsRefCnt[stream] <= 0) {
          delete this.streamsRefCnt[stream]
        }
      }
    }
    this._updateSubscriptions()
  }

  reset() {
    this.streamsRefCnt = {}
    this._updateSubscriptions()
  }

  resubmit() {
    if (this.resubmitTimeout) clearTimeout(this.resubmitTimeout)
    this.resubmitTimeout = setTimeout(() => {
      this.resubmitTimeout = null
      this._updateSubscriptions()
    }, this.resubmitDebounceTime)
  }
}
