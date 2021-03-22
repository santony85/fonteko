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

app.get('/', function (req, res) {
	
	tokens2 = [];
	
	    db.collection("feko-device", function (err, collection) {
        collection.find({type:"APNS"}).sort({"_id": -1}).toArray(function (err, items) {
	       
	        var i = items.length;
            console.log(JSON.stringify(items));
            items.forEach(function (item) {
                console.log(item['token']);
                i--;
                tokens2.push(item['token']);
                if (i == 0) {
	                
                    console.log(tokens2);
                    var itemg={
	                    production:"0",
	                    message:"Test des push",
	                    topic:"topic"
	                    
                    }
                    pushNotificationToMany(itemg);
                    res.send(items);
                }
            });
            
          })
        })
	
	});


/**********************************************************
 *                        UTILS                           *
 **********************************************************/

//--------- ok -------------//
function addToLog(wine) {
    wine['datelog'] = new Date();
    console.log('Adding to log');
    db.collection('feko-apilog', function (err, collection) {
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
	
    itemg = itemi;
    tokens2 = [];
    console.log(JSON.stringify(itemg));

    var action = {};
    action['device']       =  'ios';
    action['idclient']     =  itemg['idclient'];
    if(itemg['cat'] !== 'Tout les rayons')action[itemg['cat']]     =  '1';

    console.log("Categorie : "+itemg['cat']);
    console.log(JSON.stringify(action));

    db.collection("feko-triggersTMP", function (err, collection) {
        collection.find(action).sort({"_id": -1}).toArray(function (err, items) {


            var i = items.length;
            console.log(JSON.stringify(items));

            items.forEach(function (item) {
                console.log(item['token']);
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
            addToLog({'state': "A error code of 8 indicates that the device token is invalid."});
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






/******* end of implementation *******/
http.createServer(app).listen(10001);
console.log('Listening on port 10001...');