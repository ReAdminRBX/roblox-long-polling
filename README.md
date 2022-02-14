# Roblox-Long-Polling
*A module to make Real-Time messaging from Roblox Servers to your Node.JS server easy.*

If you need to use a scaled version you can view our scaled verion documentation by switching to its branch.

Usage:

 1. Download our RobloxModule [here](https://github.com/ReAdminRBX/roblox-long-polling/blob/master/robloxLongPolling.rbxm)
 2. Ensure HTTP Service is enabled as the steps below show
 3. Download the Roblox module by doing `npm i roblox-long-polling`
 4. Add it to your Node.JS code with the example
```js
const rlp = require("roblox-long-polling")

const poll = new rlp({
    port: 5000, // Add this behind your IP, example: http://127.0.0.1:2004,
    //password: "passsword here" If you want to add a simple password, put uncomment this and add your password
});

poll.on('connection', (connection) => {
    console.log('New connection', connection.id);// Will fire when a new connection is active, and include this IP address.
    poll.broadcast("new connection", connection.id); // Will broadcast to all active sockets that this one has joined the part.

    connection.send('welcome', 'hello there!') // Will send a welcome message to the new socket.
    connection.on('hello', (data) => {//On a event we will handle the hello message
        console.log("received hello message!", data)
    })

    connection.on('internal_ping', () => {//We receive pings from the server to let us know its still alive, you can't disable this.
        console.log("Keep-Alive Ping received")
    })

    connection.on('dsconnect', () => { // Fired when the game sends a disconnect command, or our timeout is fired.
        console.log('Disconnection', connection.id)
        poll.broadcast("disconnection", connection.id);
    })
})
```
 5. Now, we're going to install a script in ServerScriptService that requires the Module we imported earlier, this is our magic code that allows you to interface with the Node.JS API.
```lua
local robloxLongPolling = require(script.Parent.robloxLongPolling)

  

local connection = robloxLongPolling.Connect("http://yourIphere:5000", "")

connection:on("welcome", function(message)--This is an event fired in the above example, you can change this if you want into your own events.
    print("received welcome ", message)
end)

connection:on("new connection", function(id)--This is an event fired in the above example, you can change this if you want into your own events.
    print("new connection ", id)
end)

connection:on("disconnection", function(id)--Fired if we for some reason get disconnected.
    print("disconnection ", id)
end)
connection:send("hello", "Hello world!")--Example on how to send messages.

wait(30)
connection:Disconnect()
```

# Enabling HTTP Service

 1. Head on over to your game in Roblox Studio
 2. Open the top bar, and click "HOME"
 3. Click the cog named "Game Settings"
 4.  In the modal that opens, click "Security"
 5.  Ensure "Allow HTTP Requests" is enabled, if it isn't, enable it.

# Contributors

You are free to contirbute if you wish.