
const fs = require("fs")

const http = require("http")
const cors = require("cors")
const express = require("express")

const { v4: uuidv4 } = require("uuid")
const { WebSocketServer } = require("ws")

const app = express()
const server = http.createServer(app)
const io = new WebSocketServer({ noServer: true })

const router = {
    accounts: express.Router(),
    chats: express.Router()
}

let storage = {}
let devices = []
let unsent = []

app.use(cors())
app.use(express.json())

app.use("/accounts", router.accounts)

router.accounts.post("/authorize", (request, response) => {
    found = null
    if (request.body.token) {
        /* Get all Chats */
        storage.accounts.forEach((account) => {
            if (account[0].session === request.body.token) {
                found = {
                    id: account[0].id,
                    token: account[0].session
                }
                chats = [account[1].map((id) => (id)), { direct: [], groups: [] }]
                storage.accounts.forEach((account) => {
                    if (chats[0].includes(account[0].id)) {
                        chats[1].direct.push({
                            id: account[0].id,
                            name: account[0].name,
                            username: account[0].username
                        })
                        chats[0].splice(chats[0].indexOf(account[0].id), 1)
                    }
                })
                storage.groups.forEach((group) => {
                    if (chats[0].includes(group.id)) {
                        chats[1].groups.push({
                            id: group.id,
                            name: group.name
                        })
                        chats[0].splice(chats[0].indexOf(account[0].id), 1)
                    }
                })
                found.chats = chats[1]
            }
        })
        if (found) {
            response.json(found)
        } else {
            response.json({ token: null })
        }
    } else if (request.body.code) {
        data = JSON.parse(Buffer.from(request.body.code, "base64").toString("ascii"))
        storage.accounts.forEach((account) => {
            if (account[0].username === data.username) {
                account[0].session = uuidv4()
                found = account[0].session
            }
        })
        fs.writeFileSync("./storage", JSON.stringify(storage))
        response.json({ token: found })
    }
})

io.on("connection", (socket, request) => {
    socket.on("message", (data) => {
        types = ["direct", "groups"]
        packet = JSON.parse(Buffer.from(data.toString(), "base64").toString("ascii"))
        types.forEach((type) => {
            if (type === "groups") {
                online = devices.map((device) => (device[0]))
                members = storage.accounts.filter((account) => (account[1].includes(packet.id)))
                members.forEach((member) => {
                    if (online.includes(member[0].session)) {
                        devices[online.indexOf(member[0].session)][1].send(btoa(JSON.stringify({
                            type: packet.type,
                            id: packet.id,
                            from: [packet.from, storage.accounts.filter((account) => (account[0].id === packet.from))[0][0].name],
                            content: packet.content
                        })))
                    }
                })
            }
        })
    })
    socket.on("close", () => {
        storage.accounts.forEach((account) => {
            if (account[0].session === socket.uuid) {
                devices.forEach((device) => {
                    if (device[0] === account[0].session) {
                        devices.splice(devices.indexOf(device), 1)
                    }
                })
            }
        })
    })
    token = (new URLSearchParams(request.url.split("?")[1])).get("token")
    devices.push([token, socket])
    socket.uuid = token
})

server.on("upgrade", (request, socket, head) => {
    io.handleUpgrade(request, socket, head, (socket, request) => {
        data = new URLSearchParams(request.url.split("?")[1])
        if (data.get("token") && storage.accounts.filter(
            (account) => (account[0].session === data.get("token"))
        ).length > 0) {
            io.emit("connection", socket, request)
        } else {
            socket.close()
        }
    })
})

server.listen(5000, () => {
    if (!fs.existsSync("./storage")) {
        fs.writeFileSync("./storage", JSON.stringify({
            accounts: [
                [{ id: uuidv4().split("-")[0], username: "zaviercyx", name: "Zavier", session: null }, []],
                [{ id: uuidv4().split("-")[0], username: "jeyrome_92", name: "Jeyrome", session: null }, []],
                [{ id: uuidv4().split("-")[0], username: "tehroriz", name: "Jing Heng", session: null }, []],
                [{ id: uuidv4().split("-")[0], username: "viles", name: "Joshua", session: null }, []],
                [{ id: uuidv4().split("-")[0], username: "jk_rules", name: "Jerold", session: null }, []],
                [{ id: uuidv4().split("-")[0], username: "megachua", name: "Ethan", session: null }, []]
            ],
            groups: [
                { id: uuidv4().split("-")[3], name: "Average Gaming", owner: null }
            ],
            blacklisted: []
        }))
    }
    storage = JSON.parse(fs.readFileSync("./storage"))
})