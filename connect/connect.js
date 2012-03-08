var http = require('http');
var os = require('os');
var url = require("url");
var fs = require("fs");
var querystring = require("querystring");

var exec = require('child_process').exec
var test = "null"
var aps = [];


var handle = {}
handle["/"] = start;
handle["/start"] = start;
handle["/connect"] = connect;
handle["/image/loading.gif"] = load_image;
handle["/image/fail.jpg"] = load_image;
handle["/image/ok.jpg"] = load_image;

var app = http.createServer(function (req, res) {
	var postData = "";
	var pathname = url.parse(req.url).pathname;
	
	console.log("Request for " + pathname + " received.");

	req.setEncoding("utf8");
	req.addListener("data", function(postDataChunk) {
		postData += postDataChunk;
	});

	req.addListener("end", function() {
		route(handle, pathname, res, postData);
	});

}).listen(1337, "127.0.0.1");

var io = require('socket.io').listen(app)

function load_image(pathname, res, postData) {
	var img = /\/image\/(.*)/.exec(pathname)[1];
	fs.readFile(img, function(err, data){
    		res.writeHead(200, {"Content-Type": "image/gif"});
		res.write(data, "binary");
		res.end();
	});
}

function route(handle, pathname, response, postData) {
  console.log("About to route a request for " + pathname);
  if (typeof handle[pathname] === 'function') {
    handle[pathname](pathname, response, postData);
  } else {
    console.log("No request handler found for " + pathname);
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not found");
    response.end();
  }
}

function start(pathname, res, postData) {
	res.writeHead(200, {"Content-Type": "text/html"});
	//respond_with_file('start.htm');
	var body = '<html>'+
	'<head>'+
    	'<meta http-equiv="Content-Type" content="text/html; '+
	'charset=UTF-8" />'+
    	'</head>'+
	'<body>'+
	'<center>'+
	'<form action="/connect" method="post">'+
	'<select name=ssid>' +
  	items() +
	'</select>'+
	'<br>' +
        'Password: <input type="text" name="pass" /><br />' + 
	'<input type="submit" value="Connect" />'+
	'</form>'+
	'</center>'+
	'</body>'+
	'</html>';
	res.write(body);
	res.end();	
}

function connect(pathname, res, postData) {
	var values=querystring.parse(postData);

	fs.writeFile("wireless-wpa.conf", '# config file using WPA/WPA2-PSK Personal key.\n\
	\n\
	ctrl_interface=/var/run/wpa_supplicant\n\
	\n\
	network={\n\
	ssid="' + values.ssid + '"\n\
	scan_ssid=1\n\
	key_mgmt=WPA-PSK\n\
	psk="' + values.pass +'" \n\
	} \n', function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("The file was saved!");
		}
	}); 
	var wireless_wpa;
	io.sockets.on('connection', function (socket) {
		console.log("got connection!");
		exec("ifconfig", function (error, stdout, stderr) {
			console.log(stdout);
			var match = /wlan\d/g.exec(stdout);
			wireless_wpa = exec("sudo ./wireless-wpa.sh " + match[0], {timeout:60000}, function (error, stdout, stderr) {
				console.log("got result!" + error + stdout + stderr);			
				if (error == null){
					console.log("sending ok!");
					socket.emit('ok');
				} else {
					console.log("sending fail!");
					socket.emit('fail');
				}
				res.end();
			});
		});
	});
	io.sockets.on('stop', function(socket) {
		wireless_wpa.kill();
	});		
	respond_with_file(res, 'connect.htm');
}

function respond_with_file(res, file) {
	fs.readFile(file, function(error, content) {
		if (error) {
		    	res.writeHead(500);
		    	res.end();
		}
		else {
		    	res.writeHead(200, { 'Content-Type': 'text/html' });
		    	res.end(content, 'utf-8');
		}
    	});
}

// Kan göras med ajax i klienten?
function items() {
	var list = "";
	for (i in aps) {
		list += '<option value=' + aps[i].ssid + '>' + aps[i].ssid + " " + aps[i].strength + " " + aps[i].encryption + "</option>";
	}
	return list;
}

var essidRegExp = /ESSID:(.*)$/mg
var strengthRegExp = /level=(.*)\/.*$/mg
var encryptionRegExp = /Encryption key:(.*)$/mg

function match(string, regexp) {
	var list=[];
	var match = regexp.exec(string);
	while (match != null) {
            list.push(match[1]);	
	    match = regexp.exec(string);
	}	
	return list;
}


function scan() {
	exec("sudo iwlist scan", function (error, stdout, stderr) {
		var ssids = match(stdout, essidRegExp);
		var strengths = match(stdout, strengthRegExp);
		var encryptions = match(stdout, encryptionRegExp)
		aps = [];
		for (i in ssids) {
			aps[i] = new Object();
			aps[i].ssid = ssids[i];
			aps[i].strength = parseInt(strengths[i]);
			aps[i].encryption = encryptions[i] == "on";
		}
			aps.sort(function(a, b) {
			return (a.strength < b.strength ? 1 : (b.strength < a.strength ? -1 : 0)); 
		}); 
	});
}

scan();

setInterval(scan, 5000);

console.log('Server running at http://127.0.0.1:1337/');
