require("dotenv").config();
const express = require("express");
const fs = require("fs");
const app = express();
const dataFile = "data.json";
const expiration_time = process.env.EXPIRATION_TIME * 60000;
var data = {};
if (fs.existsSync(dataFile)) data = JSON.parse(fs.readFileSync(dataFile));
app.get("/:app?/:room?/:peerid?/:username?", (req, res) => {
  const { app, room, peerid, username, remove } = req.params;
  if (!app) {
    res.json({
      error: "app name required",
      usage: "/appid<required>/roomname/peerid/username?password=roompassword",
    });
    return;
  }
  const time = Date.now();
  const { password } = req.query;
  Object.keys(data).forEach(appid => {
    if (time - data[appid].tick > expiration_time) {
      delete data[appid];
      return;
    }
    Object.keys(data[appid].rooms).forEach(roomid => {
      if (time - data[appid].rooms[roomid].tick > expiration_time) {
        delete data[appid].rooms[roomid];
        return;
      }
      Object.keys(data[appid].rooms[roomid].users).forEach(peerid => {
        if (
          time - data[appid].rooms[roomid].users[peerid].tick >
          expiration_time
        ) {
          delete data[appid].rooms[roomid].users[peerid];
          return;
        }
      });
    });
  });
  if (!data[app]) data[app] = { rooms: {} };

  data[app].tick = time;
  if (!room) {
    res.json(
      Object.keys(data[app].rooms).map(key => {
        const adata = data[app].rooms[key];
        var public = true;
        if (adata.password) public = false;
        return {
          room: key,
          public,
          users: adata.users && Object.keys(adata.users).length,
        };
      })
    );
    fs.writeFileSync(dataFile, JSON.stringify(data));
    return;
  }
  if (!data[app].rooms[room]) data[app].rooms[room] = { users: {}, password };
  data[app].rooms[room].tick = time;

  if (data[app].rooms[room].password !== password) {
    res.json({ error: "password incorrect" });
    return;
  }
  if (!peerid) {
    res.json(
      Object.keys(data[app].rooms[room].users).map(key => {
        const { username } = data[app].rooms[room].users[key];
        return { username, peerid: key };
      })
    );
    fs.writeFileSync(dataFile, JSON.stringify(data));
    return;
  }

  var errors = [];
  if (!username) {
    res.json({ error: "username required" });
    return;
  }
  if (
    !data[app].rooms[room].users[peerid] &&
    Object.keys(data[app].rooms[room].users).filter(
      pid => data[app].rooms[room].users[pid].username === username
    ).length > 0
  ) {
    res.json({ error: "name taken" });
    return;
  }
  if (!data[app].rooms[room].users[peerid])
    data[app].rooms[room].users[peerid] = { tick: time, username, peerid };
  if (remove) delete data[app][room][peerid];
  fs.writeFileSync(dataFile, JSON.stringify(data));
  res.json(
    Object.keys(data[app].rooms[room].users).map(key => {
      const { username } = data[app].rooms[room].users[key];
      return { username, peerid: key };
    })
  );
});

app.listen(process.env.PORT, () => {
  console.log(`running on port ${process.env.PORT}`);
});
