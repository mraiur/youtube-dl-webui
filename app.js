var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var fs = require('fs');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sassMiddleware = require('node-sass-middleware');
var spawn = require( 'child_process' ).spawn;

var auth = require('express-authentication');
var basic = require('express-authentication-basic');

var usersJson = require("./users.json");

var mp3Dir = __dirname+"/public/mp3/";


var login = basic(function verify(challenge, callback)
{
	var match = null;
	usersJson.map( function(user){
		if( user.username === challenge.username && user.password === challenge.password )
		{
			match = user;
		}
	});

	if( match )
	{
		return callback(null, true, { user: match.username });
	}
	else
	{
		return callback(null, false, { error: 'INVALID_PASSWORD' });
	}


});

var app = express();
app.use(login);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function(req, res) {
	if (req.authenticated)
	{
		res.render('form', { title: 'Express' });
	} else {
		res.status(401).send();
	}
});

var shellCommand = function(options, callback)
{
	if( fs.existsSync( options.errLogFile ) )
	{
		fs.unlinkSync( options.errLogFile);
	}

	if( fs.existsSync( options.outLogFile ) )
	{
		fs.unlinkSync( options.outLogFile);
	}

	var cmd = spawn(
		options.cmd,
		options.params,
		{
			cwd: options.cwd
		}
	);
;
	cmd.stdout.pipe( fs.createWriteStream(options.outLogFile, { flags: 'a' }) );
	cmd.stderr.pipe( fs.createWriteStream(options.errLogFile, { flags: 'a' }));

	cmd.stderr.on('message', function (data)
	{
		console.log("message", data);
	});

	cmd.on('error', function (code)
	{
		console.log("error", arguments);
	});

	cmd.on('exit', function (code)
	{
		console.log("exit", code);
		if(callback)
		{
			callback();
		}
	});
};

app.post("/", function(req, res)
{
	if (req.authenticated)
	{
		var video = req.body.video;
		shellCommand({
			errLogFile : __dirname+"/logs/convert_err",
			outLogFile : __dirname+"/logs/convert_out",
			cmd: "youtube-dl",
			cwd: mp3Dir,
			params: [
				'--extract-audio',
				'--audio-format',
				'mp3',
				video
			]
		});
		res.render('form');
	}
});

var videoExtensions = ["mkv", "m4a", "mp4", "ogg", "webm", "flv"];
app.get("/list", function(req, res){
	if (req.authenticated)
	{
		var list = fs.readdirSync(mp3Dir);
		var map = {};
		list.map( function(file)
		{
			var ext = file.split('.').pop();
			var fileName = file.substr(0, file.length - ext.length -1);

			if( ext === "mp3" || videoExtensions.indexOf(ext) > -1)
			{
				if (!map[fileName])
				{
					map[fileName] = {
						fileName: fileName,
						url: escape(fileName+".mp3"),
						fileSize: 0,
						completed: true
					}
				}
				if( ext === "mp3")
				{
					var stats = fs.statSync(mp3Dir + file);
					map[fileName].fileSize = (stats.size / 1024 / 1024).toFixed(2);
				}
				if ( videoExtensions.indexOf(ext) > -1 ) {
					map[fileName].completed = false;
				}
			}
		});

		res.render('listing', { files: map });
	}
});

app.get("/download", function(req, res){
	if (req.authenticated)
	{
		var file = unescape(req.query.file);
		console.log(mp3Dir+file);
		res.download(mp3Dir + file);
	}
});

app.post("/download", function(req, res){
	if (req.authenticated)
	{
		var file = unescape(req.query.file);
		res.download(mp3Dir + file);
	}
});

app.post('/clearDownloads', function (req, res) {
	if (req.authenticated)
	{
		var list = fs.readdirSync(mp3Dir);

		list.map( function(file)
		{
			if( file !== ".gitignore" )
			{
				fs.unlinkSync(mp3Dir + file);
			}
		});
		res.send("true");
	}
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
