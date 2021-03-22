/**********************************************************
 *                       IMPORTS                          *
 **********************************************************/
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var http = require('http');
var fs = require('fs');
var cors = require('cors');
var app = express();
var apn = require('apn');
var gcm = require('node-gcm');
var mongo = require('mongodb');
var CronJob = require('cron').CronJob;

var cronliste = [];

app.use(express.static(__dirname + '/public')); 	// set the static files location /public/img will be /img for users
app.use(morgan('dev'));
// log every request to the console
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors());

var mongo = require('mongodb');
var Server = mongo.Server,
    Db = mongo.Db;
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('fonteko', server);

//console.log(server);
//console.log(db);

db.open(function(err, db) {
  if(!err) {
    db.authenticate("AdminDbR@@t", "NewPass2015", function(err, res) {
      // callback
      console.log("Connected to 'fonteko' database");
     
    });
  }
});

var tokens2 = [];
var itemg;




/**********************************************************
 *                        ROUTES                          *
 **********************************************************/

app.get('/', getToken);

app.get('/list', function (req, res) {
    res.send(JSON.stringify(cronliste));
});

app.get('/cron/:id', function (req, res) {
    var id  = req.params.id.toString();
    var ObjectID = require('mongodb').ObjectID;

    console.log("The Id : " + id);
    addToLog(req.params, null);

    db.collection("feko-push", function (err, collection) {
        collection.findOne({'_id': new ObjectID(id)}, function (err, item) {
            //console.log(JSON.stringify(item));
            addToLog(item);
            addCron(item);
            collection.update({'_id': new ObjectID(id)}, {$set: {"state": "1"}}, function (err, item) {
                res.send(220);
            });
        });
    });
});

app.get('/delcron/:id', function (req, res) {
    console.log("del push");
    var id = req.params.id;
    addToLog(req.params);

    var pos = -1;
    var i = 0;
    cronliste.forEach(function (nitem) {
        if (nitem.id == id) {
            console.log("find->" + nitem.id);
            nitem.job.stop();
            pos = i;

        }
        else console.log("pas bon->" + nitem.id);
        i++;
    });
    if (pos >= 0) {
        console.log("donc del->" + pos);
        cronliste.splice(pos, 1);
    }

    res.send(220);
});

/**********************************************************
 *                        UTILS                           *
 **********************************************************/

//--------- ok -------------//
function addToLog(wine) {
    wine['datelog'] = new Date();
    console.log('Adding to log');
    db.collection('apilog', function (err, collection) {
        collection.insert(wine, {safe: true}, function (err, result) {
            if (!err) {
                console.log(JSON.stringify(result[0]));
            }
        });
    });
}

function tmp(item) {
    console.log(item['message']);
}


/**********************************************************
 *                      PARTIE IPHONE                     */

function getToken(itemi) {

	console.log("Get token Iphone");

    itemg = itemi;
    tokens2 = [];
    //console.log(JSON.stringify(itemg));

    var action = {};
    action['type']       =  'APNS';

    console.log(JSON.stringify(action));

    db.collection("feko-device", function (err, collection) {
        collection.find(action).sort({"_id": -1}).toArray(function (err, items) {

            var i = items.length;
            //console.log(JSON.stringify(items));

            items.forEach(function (item) {
                i--;
                tokens2.push(item['token']);
                if (i == 0) {
                    console.log(tokens2);
                    pushNotificationToMany(itemg);
                }
            });
        });
    });
}

function pushNotificationToMany(item) {

  var production = false;
    var pfx = './_cert/fontekoD.p12';
    var passphrase = 'fontekoD';

    if(item['production'] == "1"){
        production = true;
        pfx = './_cert/fonteko.p12';
        passphrase = 'fonteko';
    }


    console.log(pfx);

    /******* implementation *******/
    var options = {
        "pfx": pfx,
        "passphrase": passphrase,
        "production": production,
        "batchFeedback": true,
        "interval": 300
    };


    var service = new apn.Provider(options);

    service.on("connected", function () {
        console.log("Connected");
        addToLog({'state': 'Connected'});
    });

    service.on("transmitted", function (notification, device) {
        console.log("Notification transmitted to:" + device.token.toString("hex"));
        addToLog({'state': "Notification transmitted to:" + device.token.toString("hex")});
    });

    service.on("transmissionError", function (errCode, notification, device) {
        console.error("Notification caused error: " + errCode + " for device ", device, notification);
        if (errCode === 8) {
            console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
            addToLog({'state': "A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox"});
        }
    });

    service.on("timeout", function () {
        console.log("Connection Timeout");
        addToLog({'state': 'Connection Timeout'});
    });

    service.on("disconnected", function () {
        console.log("Disconnected from APNS");
        addToLog({'state': 'Disconnected from APNS'});
    });

    service.on("socketError", console.error);




		    console.log("Sending the same notification each of the devices with one call to pushNotification.");
		    var note = new apn.Notification();
		    note.expiry = Math.floor(Date.now() / 1000) + 3600;
		    note.payload = {'messageFrom': 'John Appleseed'};
		    note.alert = item['message'];
		    note.badge = 1;
		    note.topic = "planb.fonteko-app" ;
		    console.log(note);
		    service.send(note, tokens2).then(function (result){
		        console.log(JSON.stringify(result));
		        addToLog({'state': result});
		    });

}

function handleFeedback(feedbackData) {
    feedbackData.forEach(function (feedbackItem) {
        console.log("Device: " + feedbackItem.device.toString("hex") + " has been unreachable, since: " + feedbackItem.time);
        addToLog({'state': "Device: " + feedbackItem.device.toString("hex") + " has been unreachable, since: " + feedbackItem.time});

    });
}


/**********************************************************
 *                      PARTIE ANDROID                    */

function getTokenAnd(itemi) {
	console.log("Get Android Token");

    itemg = itemi;
    var tokens3 = [];

    var action = {};
    action['type']       =  'FCM';

    db.collection("feko-device", function (err, collection) {
        collection.find(action).sort({"_id": -1}).toArray(function (err, items) {
            var i = items.length;
            items.forEach(function (item) {
                //console.log(item['token']);
                i--;
                tokens3.push(item['token']);
                if (i == 0) {
                    //console.log(tokens3);
                    pushNotifAndroidToMany(tokens3, itemg);
                }
            });
        });
    });
}

function pushNotifAndroidToMany(items, mess) {
	console.log("Push Notification To Android");

    var message = new gcm.Message();
    
    //var id = 'AIzaSyDTfhMqw1TxvvhOY2QHjH6uWhXGQ4uYv2w';
    //var id = 'AIzaSyDN_Obzn3VwkacCkfSi0PN34-CABworLVA';
    //var id = 'AIzaSyA7mvA4oSVMibYkpEGjSx6ztXkQYFL_UJM';
    var id = 'AAAANCHhGtw:APA91bG5WGjcecDJPhm91sXXckJotD4LP_CYuETXn3czc5QtbdMbujMk4IArnGvvm77BQogTZrUbSgqSqk7dCGt4uf7-OoI8-_mOTcsV4MdcCpTQSjFcIWWH572dGtF46JAbANG7rmsb';
    
    var sender = new gcm.Sender(id);

    // Value the payload data to send...
    message.addData('message', mess['message']);
    message.addData('title', 'FONTEKO');
    message.addData('msgcnt', '1'); // Shows up in the notification in the status bar
    message.addData('soundname', 'beep.wav'); //Sound to play upon notification receipt - put in the www folder in app
    message.timeToLive = 3000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
    
    sender.send(message, items, 4, function (error, result) {
        console.log(result);
        console.log(error);
    });
}


/**********************************************************
 *                       PARTIE CRON                      */

function updateCron(item) {
	console.log("Update Cron");
    var ObjectID = require('mongodb').ObjectID;
    db.collection("feko-push", function (err, collection) {
        collection.findOne({'_id': new ObjectID(item._id)}, function (err, item2) {
            collection.update({'_id': new ObjectID(item._id)}, {$set: {"state": "2"}}, function (err, item3) {
                //console.log("updated");
            });
        });
    });
}

function addCron(item) {

    console.log("ADDCRON The Id : " + JSON.stringify(item));

    var parsedDate = new Date(Date.parse(item['date']));
    var mnt = new Date();
    
    var seconds = 3;
    var mDate = new Date(parsedDate.getTime() + (1000 * seconds));
    var CronJob = require('cron').CronJob;

    var push = {
        item: item,
        greeting: function () {
            return  this.item;
        }
    };
    
    var job = new CronJob(mDate, function(){
            console.log('Pushs will be sent');
            updateCron(this);
            getToken(this);
            getTokenAnd(this);

        },function () {
            // This function is executed when the job stops
            console.log('Fini');
        },
        false,
        'Europe/Paris',
        item
    );

    var njob={
        id  :item._id,
        job :job
    };

    cronliste.push(njob);

    njob.job.start(); 
}

function reloadCron() {
    console.log("reload all cron");
    db.collection("feko-push", function (err, collection) {
        collection.find().sort({"_id": -1}).toArray(function (err, items) {
            var i = items.length;
            items.forEach(function (item) {
                addCron(item);
            });
        });
    });
}

/******* end of implementation *******/
http.createServer(app).listen(10001);
console.log('Listening on port 10001...');