const express = require("express");
const fs = require("fs");
const app = express();
const dataFile = "data.json";
const data = JSON.parse(fs.readFileSync(dataFile));
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

app.listen(8030, () => {
  console.log("running");
});
