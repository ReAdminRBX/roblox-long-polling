const events = require('events');

class Connection {

    constructor(id, removeInstance) {
        this.stream = new events.EventEmitter();
        this.id = id;
        this.lastPing = new Date();

        this.readyToReceive = false;
        this.sending = false;
        this.sendQueue = [];

        this._removeInstance = removeInstance;



        this.pingInterval = setInterval(() => {
            if (this.lastPing <= new Date(new Date().getTime() - 1000 * 30)) {
                this._disconnect();
                this.stream.emit('disconnect', 'no ping receive');
            } else {
                this.send('internal_ping')
            }
        }, 1000 * 2.5)
    }

    on(event, handler) {
        this.stream.on(event, handler);
    }

    send(name, message) {
        this.sendQueue.push([name, message]);
    }


    /** @internal */
    _get(req, res) {
        this.lastPing = new Date();
        this.readyToReceive = true;
        this.sending = true;

        const gettingInterval = setInterval(() => {
            if (this.sendQueue.length !== 0) {
                const removing = this.sendQueue.shift()
                clearInterval(gettingInterval)
                this.lastPing = new Date();
                res.json({
                    success: true,
                    event: {
                        name: removing[0],
                        data: JSON.stringify(removing[1])
                    }
                });
            }
        }, 60)

        res.on('end', () => {
            clearInterval(gettingInterval);
            this.readyToReceive = false;
            this.sending = false;
        })
    }

    /** @internal */
    _post(req, res) {
        this.lastPing = new Date();

        if (req.body.name !== undefined && req.body.data !== undefined) {
            const name = Buffer.from(req.body.name,'base64').toString();
            const data = Buffer.from(req.body.data,'base64').toString();
            this.stream.emit(name, data)

            res.json({
                success: true
            })
        } else {
            res.status(400).json({
                success: false,
                reason: "missing paramaters"
            })
        }
    }

    /** @internal */
    _disconnect(req, res) {
        this.stream.emit('disconnect', 'called to disconnect')
        clearInterval(this.pingInterval)
    }

}

module.exports = Connection;