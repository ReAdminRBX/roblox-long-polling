const events = require('events');

class Connection {

    constructor(id, removeInstance, publisher, subscriber, cache) {
        this.stream = new events.EventEmitter();
        this.id = id;
        this.lastPing = new Date();

        this.readyToReceive = false;
        this.sending = false;
        this.sendQueue = [];

        this.publisher = publisher;
        this.subscriber = subscriber;
        this.cache = cache;

        this._removeInstance = removeInstance;


        subscriber.on("message", (event, datar) => {
            try{
                if (event == `${id}-data` || event == `global-send-data`){
                    const {name, data} = JSON.parse(datar);
                    this.send(name, data);
                }else if(event == `${id}-send`){
                    const {name, data} = JSON.parse(datar);
                    this._emit(name, data)
                }else if(event == `${id}-disconnect`){
                    this._disconnect();
                }
            }catch(e){

            }
        })
        subscriber.subscribe(`${id}-data`)
        subscriber.subscribe(`${id}-send`)
        subscriber.subscribe(`${id}-disconnect`)
        subscriber.subscribe(`global-send-data`)

        this.messageInterval = setInterval( async () => {
            const listening = await this.cache.get(`${id}-poll`);
            if (listening == "listening"){
                this.lastPing = new Date();
                //check data
                if (this.sendQueue.length !== 0) {
                    const removing = this.sendQueue.shift()
                    publisher.publish(`${id}-data`, JSON.stringify([
                        removing[0],
                        removing[1]
                    ]));
                }
            }
        }, 150)
        this.pingInterval = setInterval(async () => {
            if (this.lastPing <= new Date(new Date().getTime() - 1000 * 30)) {
                this._disconnect();
            } else {
                this._emit('internal_ping', 'sending')
                this.send('internal_ping', "")
            }
        }, 1000*2.5)
    }

    on(event, handler) {
        this.stream.on(event, handler);
    }

    send(name, message) {
        if (name !== undefined && message !== undefined){
            this.sendQueue.push([name, message]);
        }
    }

    /** @internal */
    _emit(event, handler) {
        this.stream.emit(event, handler);
    }

    /** @internal */
    _disconnect(req, res) {
        this._emit('disconnect', 'called to disconnect')
        clearInterval(this.pingInterval)
        clearInterval(this.messageInterval)
    }

}

module.exports = Connection;