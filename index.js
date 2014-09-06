require('tls').SLAB_BUFFER_SIZE = 100 * 1024;

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
var MongoClient = require('mongodb').MongoClient;
var geoip = require('geoip-lite');

app.listen(80);

var arrRegions = new Array();
arrRegions.push("");
arrRegions.push("AC");
arrRegions.push("AL");
arrRegions.push("AP");
arrRegions.push("AM");
arrRegions.push("BA");
arrRegions.push("CE");
arrRegions.push("DF");
arrRegions.push("ES");
arrRegions.push("");
arrRegions.push("");
arrRegions.push("MS");
arrRegions.push("");
arrRegions.push("MA");
arrRegions.push("MT");
arrRegions.push("MG");
arrRegions.push("PA");
arrRegions.push("PB");
arrRegions.push("PR");
arrRegions.push("");
arrRegions.push("PI");
arrRegions.push("RJ");
arrRegions.push("RN");
arrRegions.push("RS");
arrRegions.push("RO");
arrRegions.push("RR");
arrRegions.push("SC");
arrRegions.push("SP");
arrRegions.push("SE");
arrRegions.push("GO");
arrRegions.push("PE");
arrRegions.push("TO");

function handler(req, res) {
    fs.readFile(__dirname + '/index.html');
    delete req;
    delete res;
}

io.set('log level', 0);

//io.set('authorization', function (handshakeData, cb) {
//	console.log('Auth: ', handshakeData.headers.origin);
//cb(null, true);
//});

var default_options = {
    server: {
        auto_reconnect: false, poolSize: 100,
        socketOptions: {
            connectTimeoutMS: 100
        }
    }
}

io.sockets.on('connection', function (socket) {
    var clientIP = socket.handshake.address.address;
    //var client = socket.handshake.query.client;
    //var client = socket.handshake.headers.referer + "";
    var client = socket.handshake.headers.origin + "";
    var objInterval, objIntervalGeneralInfo, objIntervalGeneralInfoWeek, objIntervalGeneralInfoMonth;

    //if (!client) {
    //    client = "EAD";
    //}
    //else {
    //    client = client.toUpperCase();
    //    client = client.replace(".", "");
    //}
    var database = "RTS_UNDEFINED";

    if (client == null || client == "" || client == "undefined") {
        client = socket.handshake.headers.referer + "";
    }

    client = client.replace("http://", "").replace("https://", "");
    if (client.indexOf("/") > 0) {
        client = client.substring(0, client.indexOf("/")).replace("/", "");
    }

    MongoClient.connect("mongodb://172.31.28.226:27017/RTS_Admin", function (err, conn) {
        if (err) {
            var dtNow = new Date();
            console.log(dtNow + " :: Error opening the connection!\n" + err);
            return;
        }
        else {
            var domains = conn.collection("domains");
            //console.log(client);
            domains.find({ domain: client }).toArray(function (err, items) {
                if (err) {
                    var dtNow = new Date();
                    console.log(dtNow + " :: " + err);
                    return;
                }
                else if (items) {
                    try {
                        database = items[0].database;
                        socket.on('access_save', function (objStat) {
                            //console.log(database + " :: " + client);
                            //if (database == "RTS_UNDEFINED") {
                            //    console.log(client);
                            //}

                            MongoClient.connect("mongodb://172.31.28.226:27017/" + database, function (err, conn) {
                                if (err) {
                                    var dtNow = new Date();
                                    console.log(dtNow + " :: Error opening the connection!\n" + err);
                                    return;
                                }

                                var objDashboard = new Object();
                                var objDashboardWeek = new Object();
                                var objDashboardMonth = new Object();

                                var onlineData = conn.collection("OnlineData");
                                var offlineData = conn.collection("OfflineData");

                                var dtStat = new Date();
                                dtStat.setHours(dtStat.getHours() - 3);

                                //console.log(dtStat);

                                objStat.lastActivityDate = dtStat;
                                objStat.ip = clientIP;
                                objStat.socketID = socket.id;
                                objStat._id = objStat.guid;

                                var geo = geoip.lookup(clientIP);

                                if (geo) {
                                    objStat.country = geo.country;
                                    objStat.regionCode = geo.region;
                                    if (arrRegions[parseInt(geo.region, 10)]) {
                                        objStat.region = arrRegions[parseInt(geo.region, 10)];
                                    }
                                    else {
                                        objStat.region = geo.region;
                                    }
                                    objStat.city = geo.city;
                                    objStat.coord = geo.ll;
                                }
                                else {

                                    objStat.country = "";
                                    objStat.regionCode = "";
                                    objStat.region = "";
                                    objStat.city = "";
                                    objStat.coord = "";
                                }
                                //console.log(clientIP + " :: " + geo);

                                if (objStat.lastActivityAction == "Document scroll") {
                                    delete objStat;
                                    return;
                                }

                                //console.log("Salvar..." + objStat.guid);

                                onlineData.remove({ guid: objStat.guid }, { safe: true }, function (err, results) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);
                                        return;
                                    }
                                    else {
                                        //socket.broadcast.emit('access_removed', objStat.guid);
                                        //console.log("Removeu " + results + " para " + socket.id);
                                        delete objStat;
                                    }
                                });

                                onlineData.save(objStat, { safe: true }, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);

                                        delete objStat;
                                        return;
                                    }
                                    else {
                                        delete objStat;
                                    }
                                });

                                objStat._id = null;

                                offlineData.insert(objStat, { safe: true }, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);

                                        delete objStat;
                                        return;
                                    }
                                    else {
                                        delete objStat;
                                    }
                                });

                                conn.close();
                            });
                        });

                        socket.on('access_remove', function (objStat) {
                            MongoClient.connect("mongodb://172.31.28.226:27017/" + database, function (err, conn) {
                                if (err) {
                                    var dtNow = new Date();
                                    console.log(dtNow + " :: Error opening the connection!\n" + err);
                                    return;
                                }

                                var objDashboard = new Object();
                                var objDashboardWeek = new Object();
                                var objDashboardMonth = new Object();

                                var onlineData = conn.collection("OnlineData");
                                var offlineData = conn.collection("OfflineData");

                                onlineData.remove({ guid: objStat.guid }, { safe: true }, function (err, results) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);
                                        return;
                                    }
                                    else {
                                        //socket.broadcast.emit('access_removed', objStat.guid);
                                        delete objStat;
                                    }
                                });

                                conn.close();
                            });
                        });

                        socket.on('disconnect', function () {
                            MongoClient.connect("mongodb://172.31.28.226:27017/" + database, function (err, conn) {
                                if (err) {
                                    var dtNow = new Date();
                                    console.log(dtNow + " :: Error opening the connection!\n" + err);
                                    return;
                                }

                                var objDashboard = new Object();
                                var objDashboardWeek = new Object();
                                var objDashboardMonth = new Object();

                                var onlineData = conn.collection("OnlineData");
                                var offlineData = conn.collection("OfflineData");

                                //console.log('Desconectou 1!');
                                objInterval = null;

                                /*
                                Remove do online somente quando insere um novo ou após 5 minutos sem atividade
                                para reduzir o refresh rate do dashboard
                                onlineData.remove({ socketID: socket.id }, { safe: true }, function (err, results) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);
                                        return;
                                    }
                                    else {
                                        //socket.broadcast.emit('access_removed', objStat.guid);
                                        //console.log("Removeu " + results + " para " + socket.id);
                                        delete objStat;
                                    }
                                });
                                */

                                var dtNow = new Date();
                                dtNow.setHours(dtNow.getHours() - 3);

                                onlineData.remove({ socketID: socket.id }, { safe: true }, function (err, results) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);
                                        return;
                                    }
                                    else {
                                        //socket.broadcast.emit('access_removed', objStat.guid);
                                        //console.log("Removeu " + results + " inativos a 5 minutos. (" + new Date(dtNow - (3 * 60 * 1000)) + ")");

                                        delete objStat;
                                    }
                                });

                                onlineData.remove({ lastActivityDate: { $lt: new Date(dtNow - (5 * 60 * 1000)) } }, { safe: true }, function (err, results) {
                                    if (err) {
                                        console.log(err);
                                        socket.emit('erro', err);
                                        return;
                                    }
                                    else {
                                        //socket.broadcast.emit('access_removed', objStat.guid);
                                        //console.log("Removeu " + results + " inativos a 5 minutos. (" + new Date(dtNow - (3 * 60 * 1000)) + ")");
                                        delete objStat;
                                    }
                                });

                                conn.close();

                                clearInterval(objInterval);
                                clearInterval(objIntervalGeneralInfo);
                                clearInterval(objIntervalGeneralInfoWeek);
                                clearInterval(objIntervalGeneralInfoMonth);

                                delete MongoClient;
                                delete clientIP;
                                delete conn;
                                delete objInterval;
                                delete objIntervalGeneralInfo;
                                delete objIntervalGeneralInfoWeek;
                                delete objIntervalGeneralInfoMonth;
                            });
                        });
                    }
                    catch (ex) {
                        console.log("Client: " + client + "\nOrigin:" + socket.handshake.headers.origin + "\nReferer: " + socket.handshake.headers.referer);
                    }
                }
                conn.close();
                //console.log(database);
            });
        }
    });

    //console.log("Client connected: " + client);

});

io.sockets.on('disconnect', function () {
    //console.log('Desconectou 2!');

    if (this.io.$events) {
        this.io.$events = {};
    }
    global.gc();
});