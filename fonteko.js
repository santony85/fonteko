// Chargement de la bibliothèque express
var express = require('express');
var ejs = require('ejs');
var app = express();
var http = require('http');
var https = require('https');
var path = require('path');
var Busboy = require('busboy');
var router = express.Router();


//var stripe = require('stripe')('sk_test_3kUX2N6oqkvxCZsMfP6Q1vtc00Uzn8KwxU');
//var stripe = require('stripe')('sk_test_JAmqHJa05V10CcEKvRNPrzNr00y5TcwOHm');
var stripe = require('stripe')('sk_live_ixVJWc3J94IdP1dhPOLXt81r00GZ94V7zZ');

var cors = require('cors');


app.set('view engine', 'ejs');

var fs = require('fs');
var exec = require("child_process").exec;

var bodyParser = require('body-parser')


app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

var mongo = require('mongodb');
var Server = mongo.Server,
    Db = mongo.Db;
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('fonteko', server);
var ObjectID = require('mongodb').ObjectID;

db.open(function (err, db) {
    if (!err) {
        db.authenticate("AdminDbR@@t", "NewPass2015", function (err, res) {
            // callback
            console.log("Connected to 'fonteko' database");

        });
    }
});
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

function requireLogin(req, res, next) {
    console.log("use requireLogin" + JSON.stringify(req.session.userad));
    if (!req.session.userad) {
        res.render('login.ejs', {title: 'Fonteko', perror: '', email: ''});
    } else {
        next();
    }
};

/**************************************************************/
/**************************************************************/
/***************      API fonteko        **********************/
/**************************************************************/
/**************************************************************/
app.get('/getcredit/:idqr', function (req, res) {
    var idqr = req.params.idqr.toString();
    console.log("php -f dubapi.php qr_code " + idqr)
    exec("php -f dubapi.php qr_code " + idqr, function (error, stdout, stderr) {
       // console.log(stdout);
        var request = `curl -H "ws-token: ` + stdout + `" -X POST -d '{"qr_code":"` + idqr + `"}' http://ws.groupedubreuil.fr/Fonteko/GetCredit`;
        console.log(request);
        exec(request, function (error, stdout2, stderr) {

            //console.log(stdout2);

            var dt = JSON.parse(stdout2);

            dt['DATA'] = parseInt(dt.DATA) * 12.5;
            console.log(dt)

            res.send(dt);
        });
    });
});
/**************************************************************/
app.get('/setqrcode/:idqr/:idc', function (req, res) {
    var idqr = req.params.idqr.toString();
    var idc = req.params.idc.toString();
    console.log("Add QrCode");
    exec("php -f dubapi.php nb_centime " + idqr, function (error, stdout, stderr) {
        var request = `curl -H "ws-token: ` + stdout + `" -X POST -d '{"nb_centime":"` + idqr + `"}' http://ws.groupedubreuil.fr/Fonteko/GenereQrCode`;
        var lmont = idqr;
        exec(request, function (error2, stdout2, stderr2) {

            var reslt = {};
            var data = JSON.parse(stdout2);

            if (data.DATA === null) {
                reslt = {status: "error", item: {}};
                console.log(reslt)
                res.send(reslt);
            } else {
                console.log(lmont);
                reslt = {
                    status: "success",
                    item: data,
                    idc: idc,
                    date: Date.now(),
                    //initial:idqr,
                    qrcode: data.DATA
                };
                db.collection("feko-qrcode", function (err, collection) {
                    collection.save(reslt, function (err, result) {
                        res.send(reslt);
                    });

                })
            }

        });
    });
});
/**************************************************************/
/**************************************************************/
/**************************************************************/
/**************************************************************/
/***************      API APPLI.       ************************/
/**************************************************************/
/**************************************************************/
/**************************************************************/
app.get('/items/:idc', function (req, res) {
    var idc = req.params.idc.toString();
    db.collection("feko-qrcode", function (err, collection) {
        collection.find({"idc": idc}/*,{"idc": 1, "email": 1, "qrcode": 1, "date": 1, "_id": 1}*/).sort({"date": -1}).toArray(function (err, items) {
            //console.log(items);
            //getcredit ici
            res.send(items);
        })
    })
});
/**************************************************************/
function getCredit(list) {
    var idqr = list;
    exec("php -f dubapi.php qr_code " + idqr, function (error, stdout, stderr) {
        var request = `curl -H "ws-token: ` + stdout + `" -X POST -d '{"qr_code":"` + idqr + `"}' http://ws.groupedubreuil.fr/Fonteko/GetCredit`;
        exec(request, function (error, stdout2, stderr) {
            console.log(stdout2);
            return stdout2;
        });
    });
};
/**************************************************************/
app.post('/signup', function (req, res) {
    var wine = req.body;
    wine['active'] = true;
    wine['date'] = new Date();
    //convert email lowercase
    wine['email'] = wine['email'].toLowerCase();
    db.collection("feko-client", function (err, collection) {
        collection.findOne({"email": wine.email}, function (err, item) {
            // console.log(item);
            if (item === null) {
                collection.save(wine, function (err, result) {
                    console.log(wine);
                    res.send(wine);
                });
            } else {
                res.send(500);
            }
        });
    });
});
/**************************************************************/
app.post('/add-device', function (req, res) {
    var wine = req.body;
    console.log(wine);
    db.collection("feko-device", function (err, collection) {
        collection.save(wine, function (err, result) {
            console.log(wine);
            res.send(wine);
        });
    });
});
/**************************************************************/
app.post('/login', function (req, res) {
    var wine = req.body;
    console.log(wine.email);
    db.collection("feko-client", function (err, collection) {
        collection.findOne({"email": wine.email, "password": wine.password, "active": true}, function (err, item) {
            console.log(item);
            var reslt = {};
            if (item === null) reslt = {status: "error", user: item};
            else reslt = {status: "success", user: item};
            console.log(reslt);
            res.send(reslt);
        });
    });
});
/**************************************************************/
router.post('/processpay', function (request, response) {

    //var stripe = require('stripe')('sk_test_3kUX2N6oqkvxCZsMfP6Q1vtc00Uzn8KwxU');
    var stripe = require('stripe')('sk_test_JAmqHJa05V10CcEKvRNPrzNr00y5TcwOHm');
    //var stripe = require('stripe')('sk_live_ixVJWc3J94IdP1dhPOLXt81r00GZ94V7zZ'); FONTEKO

    var stripetoken = request.body.stripetoken.id;
    var amountpayable = request.body.amount;
    var user = request.body.user;
    var fprivate = request.body.fontaine.private;
    var fontaine = request.body.fontaine;


    var stripe = require('stripe')(fontaine.kstripe);
    var charge = stripe.charges.create({
        amount: amountpayable,
        currency: 'eur',
        description: 'Transaction Fonteko',
        source: stripetoken
    }, function (err, charge) {
        if (err) {
            console.log(err);
            response.send({status: "error"});
        } else {
            console.log(fprivate);
            if (fprivate == "true") addAfterPayP(amountpayable, user, charge, fontaine).then(dataP => {
                response.send({status: "success"});
            })
            else addAfterPay(amountpayable, user, charge, fontaine).then(data2 => {
                response.send({status: "success"});
            });

        }
    })
})
function addAfterPayP(nbcent, user, trans, fontaine) {

    var nbcentc = nbcent;
    if (nbcent == 150) nbcent = parseInt(nbcent) / 15;
    else nbcent = parseInt(nbcent) / 12.5;

    console.log("Add QrCode ", nbcent);
    //console.log(fontaine);
    return new Promise(resolve => {

        db.collection("eprom-qrcode", function (err, collection) {
            collection.find({
                idfontaine: fontaine._id.toString(),
                initial: nbcent.toString(),
                status: "0"
            }).toArray(function (err, items) {
                if (items.length > 0) {
                    var mitem = items[0];
                    mitem.status = "1";
                    //console.log(items[0])
                    collection.save(mitem, function (err, result) {
                        reslt = {
                            item: mitem,
                            idc: user._id,
                            email: user.email,
                            date: Date.now(),
                            initial: nbcentc,
                            initialc: nbcent,
                            qrcode: mitem._id.toString(),
                            fontaine: fontaine,
                            stripe: trans
                        };

                        db.collection("feko-qrcode", function (err, collection) {
                            collection.save(reslt, function (err, result) {
                                if (err) resolve({status: "error"});
                                resolve({status: "success"});
                                //res.send(reslt);
                            });

                        })


                    })

                } else resolve({status: "error"});

            });
        });


    })
}
/**************************************************************/
function addAfterPay(nbcent, user, trans, fontaine) {
    console.log("Add QrCode");
    return new Promise(resolve => {
        var nbcentc = nbcent;
        if (nbcent == 150) nbcent = parseInt(nbcent) / 15;
        else nbcent = parseInt(nbcent) / 12.5;

        console.log(nbcent, nbcentc)

        exec("php -f dubapi.php nb_centime " + nbcent, function (error, stdout, stderr) {
            var request = `curl -H "ws-token: ` + stdout + `" -X POST -d '{"nb_centime":"` + nbcent + `"}' http://ws.groupedubreuil.fr/Fonteko/GenereQrCode`;
            exec(request, function (error2, stdout2, stderr2) {

                var reslt = {};
                var data = JSON.parse(stdout2);
                console.log(data);

                if (data.DATA === null) {
                    reslt = {status: "error", item: {}};
                    console.log(reslt);
                    resolve(reslt);
                    ////// !!!!! PROBLEME !!!!!! ///////
                } else {
                    console.log(user);
                    reslt = {
                        status: "success",
                        item: data,
                        idc: user._id,
                        email: user.email,
                        date: Date.now(),
                        initial: nbcentc,
                        initialc: nbcent,
                        qrcode: data.DATA,
                        fontaine: fontaine,
                        stripe: trans
                    };
                    db.collection("feko-qrcode", function (err, collection) {
                        collection.save(reslt, function (err, result) {

                            resolve({status: "success"});
                            //res.send(reslt);
                        });

                    })
                }

            });
        });

    })

}
//****************************************************************
//****************************************************************
//gestion du login
//****************************************************************
//****************************************************************
var session = require('client-sessions');
app.use(session({
    cookieName: 'session',
    secret: 'random_string_goes_here',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));
app.post('/loginapp', function (req, res) {
    console.log("req" + JSON.stringify(req.body));
    var login = req.body.login.toString();

    db.collection("feko-utilisateurs", function (err, collection) {
        collection.findOne({'login': login}, function (err, user) {
            if (!user) {
                console.log("not logged no user");
                res.render('login.ejs', {title: 'Fonteko', perror: '   email invalide', email: ""});
            } else {
                if (req.body.mdp === user.mdp) {
                    // sets a cookie with the user's info
                    req.session.userad = user;
                    delete req.session.userad.password;
                    res.redirect('/feko-fontaine');
                    console.log("logged");
                } else {
                    res.render('login.ejs', {
                        title: 'Fonteko',
                        perror: '   mot de passe invalide',
                        email: req.body.login
                    });
                    console.log("not logged mdp error");
                }
            }
        });
    });
});
app.get('/logout', function (req, res) {
    req.session.reset();
    res.redirect('/');
});
//****************************************************************
//****************************************************************


/**************************************************************/
/**************************************************************/
/***************      frontend.        ************************/
/**************************************************************/
/**************************************************************/
app.get('/feko-news', function (req, res) {

    db.collection("feko-news", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            console.log(items)
            res.render('news', {title: 'Fonteko', items: items});
        });
    });
});
/**************************************************************/
app.get('/feko-push', function (req, res) {
    db.collection("feko-push", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            res.render('push', {title: 'Fonteko', items: items});
        });
    });
});
/**************************************************************/
app.get('/feko-client', function (req, res) {

    db.collection("feko-client", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            res.render('client', {title: 'Fonteko', items: items});
        });
    });
});
/**************************************************************/
app.get('/feko-fontaine', function (req, res) {

    db.collection("feko-fontaine", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {

            db.collection("feko-lot", function (err, collection2) {
                collection2.find({assigned: "false"}).sort({"_id": -1}).toArray(function (err, items2) {
                    res.render('fontaine', {title: 'Fonteko', items: items, lots: items2});
                });
            });

        });
    });
});
/**************************************************************/
app.get('/feko-qrcode', function (req, res) {

    db.collection("feko-qrcode", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            res.render('qrcode', {title: 'Fonteko', items: items});
        });
    });
});
/**************************************************************/
app.get('/feko-lot', function (req, res) {

   /* var dep = 1241444367083120;
    var pos=0;
    var ini=[10,20,30,40,60,80];
    for(var i=0;i<600;i++){
        if(i % 100 == 0)pos++;

        var ln = (dep+i)+";"+ini[pos-1]+"\r\n"
        console.log(ln)

    }*/

    db.collection("feko-lot", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            res.render('lot', {title: 'Fonteko', items: items});
        });
    });
});
/**************************************************************/
app.get('/feko-video', function (req, res) {

    db.collection("feko-video", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            res.render('video', {title: 'Fonteko', items: items});
        });
    });
});
/**************************************************************/
app.get('/', requireLogin, function (req, res) {
    res.render('index');
});
/**************************************************************/
/***************      frontend API.        ********************/
/**************************************************************/
// accept POST request on the homepage
function getDatePush(din, hin) {
    var res = din.substring(6);
    res = res + "-" + din.substring(3, 5) + "-" + din.substring(0, 2) + " " + hin + ":00";
    console.log(din + "->" + res);
    return res;
}
app.post('/add/:col', function (req, res) {
    var busboy = new Busboy({headers: req.headers});
    var col = req.params.col.toString();

    var wine = {}
    var ObjectID = require('mongodb').ObjectID;
    var idprod;// = new ObjectID();
    var iscsv = 0;

    wine['date'] = new Date();

    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {

        console.log(fieldname);
        console.log(filename);
        console.log(encoding);
        console.log(mimetype);


        if (fieldname !== "csv") {
            var fn;
            if (filename !== "") fn = idprod + ".jpg";
            else fn = "0.jpg";
            var saveTo = path.join('./public/upload/' + col + '/', fn);
            console.log('Uploading: ' + saveTo);
            file.pipe(fs.createWriteStream(saveTo));
        } else {
            iscsv = 1;
            if (filename !== "") fn = idprod + ".csv";
            var saveTo = path.join('./public/upload/' + col + '/', fn);
            console.log('Uploading: ' + saveTo);
            file.pipe(fs.createWriteStream(saveTo));
        }


    });

    busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        if (fieldname == "_id") {
            console.log("get id");
            if (val === "") wine['_id'] = new ObjectID();
            else wine['_id'] = new ObjectID(val);
            idprod = wine['_id'];
        } else wine[fieldname] = val;
    });

    busboy.on('finish', function () {
        //console.log(wine);
        console.log('Upload complete');
        if (col === "feko-push") wine['date'] = getDatePush(wine['dateenvoi'], wine['heure']);
        if (col === "feko-lot") wine['qrcodes'] = JSON.parse(wine['qrcodes']);

        db.collection(col, function (err, collection) {
            if (col === "feko-lot") {
                addToQrCode(wine, function (qerr, data) {
                    console.log("callback ok !!")
                    console.log(qerr)

                    if (qerr) {
                        console.log("Error")
                        res.send(500)
                    } else {
                        console.log("Here i am")
                        collection.save(data, function (err, result) {
                            //res.writeHead(200, { 'Connection': 'close' });
                            res.send(200);
                            //res.send(result);
                        });

                    }
                })
            } else {
                collection.save(wine, function (err, result) {
                    res.writeHead(200, {'Connection': 'close'});
                    res.end("That's all folks!");
                    //res.send(result);
                });
            }

        });

    });

    return req.pipe(busboy);

});
function addToQrCode(wine, callback) {

    //console.log(qrcodes)
    var results = [];
    var ObjectID = require('mongodb').ObjectID;
    var fs = require('fs');


    wine.qrcodes.forEach((item, index) => {
        console.log(item)
        item.qrcode = item._id;
        item.status = "0";
        item.date = wine['date'];
        item.reste = item.initial;
        item.namelot = wine['nom'];
        item.idlot = wine['_id'].toString();
        item.idfontaine = "";
        if(item._id !== "")results.push(item);

    })
    wine.qrcodes = results;

    db.collection("eprom-qrcode", function (err, collection) {
        collection.insertMany(results, function (err2, result) {
            //console.log(result)
            if (err2) {
                console.log(err2)
                return callback(err2);
            }
            callback(null, wine);

        });
    });


}
/**************************************************************/
app.get('/updatelot/:idlot/:lot/:idfontaine', function (req, res) {
    var ObjectID = require('mongodb').ObjectID;
    var qrid = {_id: new ObjectID(req.params.idfontaine.toString())};
    var lid = {_id: new ObjectID(req.params.idlot.toString())};


    db.collection("feko-fontaine", function (err, collection) {
        var val = {$set: {idlot: req.params.idlot.toString(), lot: req.params.lot.toString()}};
        collection.updateOne(qrid, val, function (err, items) {
            console.log("phase 1 ok ")
            db.collection("feko-lot", function (err, collection) {
                var val2 = {$set: {assigned: "true", idfontaine: req.params.idfontaine.toString()}}
                collection.updateOne(lid, val2, function (err, items2) {
                    console.log("phase 2 ok ")
                    db.collection("eprom-qrcode", function (err, collection) {
                        var val3 = {$set: {idfontaine: req.params.idfontaine.toString()}}
                        console.log(val3)
                        console.log({idlot: req.params.idlot.toString()})
                        collection.updateMany({idlot: req.params.idlot.toString()}, val3, function (err, resu) {
                            console.log(resu.result.nModified + " document(s) updated");
                            console.log("phase 3 ok ")
                            res.send(200);

                        });
                    });
                });
            });
        });
    });

    //mise a jour

    //fontaine lot idlot
    /*
*/

    //lot assigned = true id fontaine


    //eprom-qrcode idfontaine nomfontaine


    /*var coll   = req.params.coll;
    db.collection(coll, function(err, collection) {
        collection.find().sort({"_id": -1}).toArray(function(err, items) {
            res.send(items);
        });
    });*/
});
/**************************************************************/
app.get('/liste/:coll', function (req, res) {
    var coll = req.params.coll;
    db.collection(coll, function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            res.send(items);
        });
    });
});
/**************************************************************/
app.get('/listeqrcodelot/:lot', function (req, res) {
    var lot = req.params.lot.toString();
    db.collection("eprom-qrcode", function (err, collection) {
        collection.find({idlot : lot }).sort({"_id": -1}).toArray(function (err, items) {
            res.send(items);
        });
    });
});
/**************************************************************/
app.get('/listeidc/:coll/:idc', function (req, res) {
    var coll = req.params.coll;
    var idc = req.params.idc;
    db.collection(coll, function (err, collection) {
        collection.find({"idc": idc}).sort({"_id": -1}).toArray(function (err, items) {
            if (coll == "feko-qrcode") {
                var itemsProcessed = 0;
                var list = [];

                items.forEach((item, index, array) => {
                    exec("php -f dubapi.php qr_code " + item.qrcode, function (error, stdout, stderr) {
                        var request = `curl -H "ws-token: ` + stdout + `" -X POST -d '{"qr_code":"` + item.qrcode + `"}' http://ws.groupedubreuil.fr/Fonteko/GetCredit`;
                        exec(request, function (error, stdout2, stderr) {
                            itemsProcessed++;
                            var dt = JSON.parse(stdout2);
                            console.log(JSON.parse(stdout2));
                            item['cred'] = parseInt(dt.DATA);
                            if (itemsProcessed === items.length) {
                                res.send(items);
                            }
                        });
                    });
                });

            } else res.send(items);
        });
    });
});
/**************************************************************/
app.get('/dellistitem/:idp/:coll', function (req, res) {
    console.log(" remove ");


    var idp = req.params.idp.toString();
    console.log(idp);
    var coll = req.params.coll;
    console.log(coll);
    db.collection(coll, function (err, collection) {
        collection.remove({'_id': new ObjectID(idp)}, function (err, removed) {
            //console.log(removed);
            res.sendStatus(200);
        });
    });
});
/**************************************************************/
app.get('/getpassword/:email', function (req, res) {
    var vemail = req.params.email.toString().toLowerCase();

    const sendmail = require('sendmail')();

    db.collection("feko-client", function (err, collection) {
        collection.findOne({'email': vemail}, function (err, user) {


            console.log("IN GETPASSWORD !!!!!!");
            console.log(user);

            if (user && user !== null) {
                console.log(vemail);
                var data = "ok " + user.email + " " + user.password;
                sendmail({
                    from: 'Contact Fonteko <contact@fonteko-apps.fr>',
                    to: vemail,
                    subject: 'Vos identifiants de connexion ',
                    html: data
                }, function (err, reply) {
                    //console.log(err && err.stack)
                    //console.dir(reply)
                    console.log(err);
                    if (err) res.send({statut: "error"});
                    else res.send({statut: "ok"});

                })

            } else {
                console.log("ici")
                res.send({statut: "not"});
            }


        })
    })

});
/**************************************************************/
app.get('/listrapportsdate/:idclient/:dated/:datef', function (req, res) {
    var idclient = req.params.idclient.toString();
    var date1 = req.params.dated.toString();
    var date2 = req.params.datef.toString();
    var dataRapport;
    var globTable=[];
    date1 = new Date(date1);
    date2 = new Date(date2);
    date2.setDate(date2.getDate() + 1);
    var params={};
    if(idclient !=='0')params['fontaine._id'] = idclient;

    db.collection("feko-qrcode", function (err, collection) {
       collection.find(params).sort({"date": 1}).toArray(function (err, items) {
        dataRapport = items;
        console.log(items)
        for(var i=0; i < dataRapport.length;i++){
            var dateRapport = new Date(dataRapport[i].date);
            if(dateRapport.getTime() >= date1.getTime() && dateRapport.getTime() <= date2.getTime())
                globTable.push(dataRapport[i]);
        }
        res.json(globTable);
    })
    })

})

/**************************************************************/
/**************************************************************/
function addCron(mid, cb) {
    var http = require('http');
    var options = {
        host: 'fonteko-apps.com',
        port: '10001',
        path: '/cron/' + mid
    };
    callback = function (response) {
        var str = '';
        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });
        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            console.log("Fini->" + str);
            cb(mid);
        });
    }
    http.request(options, callback).end();
}
app.get('/push/snd/:id', function (req, res) {
    var id = req.params.id;
    console.log('Sending push: ' + id);
    addCron(id, function (id) {
        res.redirect('/feko-push');
    });
});
/**************************************************************/
/**************************************************************/
/**************************************************************/
/**************************************************************/
/**************************************************************/
app.use(router);

var httpServer = http.createServer(app);
httpServer.listen(99);
console.log("Ready to go !!");
