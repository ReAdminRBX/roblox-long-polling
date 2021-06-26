class rlp {


    constructor(settings) {
        const express = require('express');
        const pollServer = express();
        const uuid = require('uuid').v4;
        const events = require('events');
        const helmet = require('helmet');
        const redis = require('redis');
        const aredis = require('async-redis');

        const connection = require('./models/connection')

        this.connections = {};

        this.port = settings.port || 2004;
        this.password = settings.password || '';
        this.stream = new events.EventEmitter();

        this.publisher = redis.createClient({...settings.redisConnection, prefix: "rblxpoll_"});
        this.subscriber = redis.createClient({...settings.redisConnection, prefix: "rblxpoll_"});
        this.cache = aredis.createClient({...settings.redisConnection, prefix: "rblxpoll_"});


        pollServer.use(express.json());
        pollServer.use(helmet())

        pollServer.post("/connection", async (req, res) => {
            if (this.password !== '') {
                if (req.body.password && req.body.password == this.password) {
                    const id = uuid();
                    await this.cache.set(id, id)
                    await this.cache.set(`${id}-poll`, 'notlistening')

                    this.connections[id] = new connection(id, () => {
                        delete connections[id];
                    }, this.publisher, this.subscriber, this.cache);

                    this.stream.emit('connection', this.connections[id]);
                    res.json({
                        success: true,
                        socketId: id
                    })
                } else {
                    res.status(401).json({
                        success: false,
                        reason: "Unauthorized"
                    })
                }
            } else {
                const id = uuid();
                await this.cache.set(id, "active")
                await this.cache.set(`${id}-poll`, 'notlistening')

                this.connections[id] = new connection(id, () => {
                    delete connections[id];
                }, this.publisher, this.subscriber, this.cache);
                this.stream.emit('connection', this.connections[id]);
                
                res.json({
                    success: true,
                    socketId: id
                })
            }
        })

        pollServer.get("/poll/:id", async (req, res) => {
            const id = req.params.id;
            const existingConnection = await this.cache.get(id);
            if (existingConnection !== undefined) {
                await this.cache.set(`${id}-poll`, 'listening')
                const mlistener = (channel, message) => {
                    if (channel == `${id}-data`) {
                        this.cache.set(`${id}-poll`, 'notlistening')
                        this.subscriber.unsubscribe(`${id}-data`);
                        this.subscriber.removeListener("message", mlistener)

                        const removing = JSON.parse(message);
                        res.json({
                            success: true,
                            event: {
                                name: removing[0],
                                data: removing[1]
                            }
                        });
                    }
                }
                this.subscriber.addListener("message", mlistener);
                this.subscriber.subscribe(`${id}-data`);
            } else {
                res.status(400).json({
                    success: false,
                    reason: "Not a valid connection"
                })
            }
        })
        pollServer.post("/poll/:id", async (req, res) => {
            const id = req.params.id;
            const existingConnection = await this.cache.get(id);
            if (existingConnection !== undefined) {

                if (req.body.name !== undefined && req.body.data !== undefined) {
                    this.publisher.publish(`${id}-send`, JSON.stringify({
                        name: req.body.name,
                        data: req.body.data
                    }))

                    res.json({
                        success: true
                    })
                } else {
                    res.status(400).json({
                        success: false,
                        reason: "missing paramaters"
                    })
                }
            } else {
                res.status(400).json({
                    success: false,
                    reason: "Not a valid connection"
                })
            }
        })

        pollServer.delete("/connection/:id", async (req, res) => {
            const id = req.params.id;
            const existingConnection = await this.cache.get(id);
            if (existingConnection !== undefined) {
                this.publisher.publish(`${id}-disconnect`, JSON.stringify({info: 'closed-by-client'}))
                res.json({
                    success: true
                })
            } else {
                res.status(400).json({
                    success: false,
                    reason: "Not a valid connection"
                })
            }
        })


        pollServer.listen(this.port)
    }

    on(event, handler) {
        return this.stream.on(event, handler)
    }

    broadcast(name, message) {
        this.publisher.publish(`global-send-data`, JSON.stringify({
            name: name,
            data: message
        }))

    }

}

module.exports = rlp