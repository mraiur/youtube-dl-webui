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

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
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

app.post("/convert", function(req, res){
	if (req.authenticated)
	{
		var errLogFile = __dirname+"/public/mp3/err";
		var outLogFile = __dirname+"/public/mp3/out";
		if( fs.existsSync( errLogFile ) )
		{
			fs.unlinkSync(errLogFile);
		}

		if( fs.existsSync( outLogFile ) )
		{
			fs.unlinkSync(outLogFile);
		}

		var video = req.body.video;
		var cmd = spawn(
			"youtube-dl",
			[
				'--extract-audio',
				'--audio-format',
				'mp3',
				video
			],
			{
				cwd: mp3Dir
			}
		);
		cmd.stdout.pipe( fs.createWriteStream(outLogFile, { flags: 'a' }) );
		cmd.stderr.pipe( fs.createWriteStream(errLogFile, { flags: 'a' }));

		cmd.stderr.on('message', function (data)
		{
			console.log("message", data);
		});

		cmd.on('exit', function (code)
		{
			console.log("exit", code);
		});

		cmd.on('error', function (code)
		{
			console.log("error", arguments);
		});
		res.redirect("/list");
	}
});

app.get("/list", function(req, res){
	if (req.authenticated)
	{
		var list = fs.readdirSync(mp3Dir);
		var map = {};
		list.map( function(file)
		{
			var ext = file.split('.').pop();
			var fileName = file.substr(0, file.length - ext.length -1);
			if( ext === "mp3" || ext === "webm")
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
				if (ext === "webm") {
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
		var file = req.query.file;

		res.download(mp3Dir + file);
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
