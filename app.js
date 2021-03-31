const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const session = require('express-session');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const bcrypt = require ('bcrypt');
const request = require('request');














function symbl_generate_token(callback) {
	
	const config = {
		method: "post",
		url: "https://api.symbl.ai/oauth2/token:generate",
		body: {
		  type: "application",
		  appId: "test_appId",
		  appSecret: "test_appSecret"
		},
		json: true
	};


	request(config, (err, res, body) => {
		
		if (err) {
			console.error("error posting json: ", err);
			throw err;
		}

		callback(body);
	});	
}


function symbl_submit_text(g_token, g_text, callback) {
	
	const options = {
	  'method': 'POST',
	  'url': 'https://api.symbl.ai/v1/process/text',
	  'headers': {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${g_token}`
	  },
	  body: JSON.stringify({
		// <Optional,String| your_meeting_name by default conversationId>
		"name": "Beta Test 3",
		// <Optional,double| Minimum required confidence for the insight to be recognized. Value ranges between 0.0 to 1.0. Default value is 0.5.>
		"confidenceThreshold": 0.6,
		// <Optional,boolean| It shows Actionable Phrases in each sentence of conversation. These sentences can be found using the Conversation's Messages API. Default value is false.>
		"detectPhrases": true,
		"messages": [
		  {
			"payload": {
			  "content": g_text,
			  "contentType": "text/plain"
			}
		  }
		]
	  })
	};

	const responses = {
	  400: 'Bad Request! Please refer docs for correct input fields.',
	  401: 'Unauthorized. Please generate a new access token.',
	  404: 'The conversation and/or it\'s metadata you asked could not be found, please check the input provided',
	  429: 'Maximum number of concurrent jobs reached. Please wait for some requests to complete.',
	  500: 'Something went wrong! Please contact support@symbl.ai'
	}

	request(options, function (error, response) {
		//const statusCode = response.statusCode;
		//if (error || Object.keys(responses).indexOf(statusCode.toString()) !== -1) {
		//	throw new Error(responses[statusCode]);
		//}
		//console.log('Status code: ', statusCode);
		//console.log('Body', );
		callback(JSON.parse(response.body));
		//console.log(typeof response.body);
	});
}


function symbl_get_conversation_info(g_token, g_conversationId, callback) {
	
	request.get({
      url: `https://api.symbl.ai/v1/conversations/${g_conversationId}/messages?sentiment=true`,
      headers: { 'Authorization': `Bearer ${g_token}` },
      json: true
	}, (err, response, body) => {
		callback(body);
	});
}




// http server
// should use https only and non js cookie later
app.use(session({
	
	genid: (req) => {
		return uuidv4()
	},
	//store: new redisStore({ host: 'localhost', port: 6379, client: client, ttl :  260}),
	name: 'store457987', 
	secret: "PASS34989739457",
	resave: false,
	cookie: { httpOnly: true, secure: false, ephemeral: true, maxAge: 365 * 24 * 60 * 60 * 1000 },
	saveUninitialized: true
}));





app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));




function os_chat_create_db(db_path, callback) {
	
	try {
		if (fs.existsSync(db_path)) {
			
			callback('err database file exists');
		}
		else {
			
			let userDB = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => { 
			
				callback('creating database .. OK');
			});	
		}
	} 
	catch(err) {
		
		callback(err)
	}
}


function os_chat_open_db(db_path, callback) {
	
	let db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE, (err) => {
		
		if (err) {
			console.error(err.message);
		}
		console.log('connecting database .. OK');
		callback(db);
	});
}


function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}


function isAlphaNumeric(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
};


function os_chat_signup(g_user, g_name, g_email, g_pass, callback) {
	
	const saltRounds = 10;
	
	//console.log(validateEmail(g_email));
	//console.log(isAlphaNumeric(g_name));
	//console.log(isAlphaNumeric(g_user));
	//console.log(isAlphaNumeric(g_pass));
	
	if(validateEmail(g_email) == true && isAlphaNumeric(g_name) == true && isAlphaNumeric(g_user) == true && isAlphaNumeric(g_pass) == true) {
	
	
		console.log(g_user);
		console.log(g_name);
		console.log(g_pass);
		console.log(g_email);	
		
		bcrypt.genSalt(saltRounds, function(err, salt) {
			
			bcrypt.hash(g_pass, salt, function(err, hash) {
				
				console.log(hash);
				
				// add to db
				os_chat_open_db("master.db", function(db) {
		
					console.log(db);
					
					
					db.run('INSERT INTO user_account(g_user_id, g_username, g_email, g_password, g_fullname) VALUES(?, ?, ?, ?, ?)', [uuidv4(), g_user, g_email, hash, g_name], (err) => {
						if(err) {
							return console.log(err.message); 
						}
						console.log('Row was added to the table: ${this.lastID}');
					})					
				});			
				

				callback('OK');
			});
		});
	}
}


// auto config
function os_chat_auto_config() {
	
	
	var db_file = "master.db";
	
	os_chat_create_db(db_file, function(obj) {
	
		console.log(obj);

		os_chat_open_db(db_file, function(db) {
			
			console.log(obj);
			
			db.serialize(function() {
				
				db.run("CREATE TABLE user_account (g_user_id varchar(255) NOT NULL, g_username varchar(255) NOT NULL, g_email varchar(255) NOT NULL, g_password varchar(255) NOT NULL, g_fullname varchar(255) NOT NULL);", function(err){
					
					console.log(err);
				});		


				db.run("CREATE TABLE group_chat (g_group_id varchar(255) NOT NULL, g_user_id varchar(255) NOT NULL, g_message varchar(255) NOT NULL, g_sentiment_value varchar(255) NOT NULL, g_sentiment_message varchar(255) NOT NULL);", function(err){
					
					console.log(err);
				});				


				// check tables have been added
				db.serialize(function () {
					db.all("select name from sqlite_master where type='table'", function (err, tables) {
						console.log(tables);
					});
				});
			});
		});	
	});
}

os_chat_auto_config();



// content
app.get('/icon/main.png', function(req, res) { 

	res.sendFile(path.join(__dirname + '/static/icon/main.png'));
});

// content
app.get('/icon/paper.jpg', function(req, res) { 

	res.sendFile(path.join(__dirname + '/static/icon/paper.jpg'));
});

// content
app.get('/icon/Symbl-AI.png', function(req, res) { 

	res.sendFile(path.join(__dirname + '/static/icon/Symbl-AI.png'));
});


// user login
app.get('/login', function(req, res) { 

	var ssn = req.session; 
	if(ssn.user) {
		res.redirect('/dashboard');
	} 
	else {
		res.sendFile(path.join(__dirname + '/static/login.html'));
	}
});


// user signup
app.get('/signup', function(req, res) { 

	var ssn = req.session; 
	if(ssn.user) {
		res.redirect('/dashboard');
	} 
	else {
		res.sendFile(path.join(__dirname + '/static/signup.html'));
	}
});


// user main
app.get('/', function(req, res) { 

	var ssn = req.session; 
	if(ssn.user) {
		res.redirect('/dashboard');
	} 
	else {
		res.sendFile(path.join(__dirname + '/static/login.html'));
	}
});


// user login ok, view
app.get('/dashboard', function(req, res) {
	
	var ssn = req.session; 
	if(ssn.user) {

		res.sendFile(path.join(__dirname + '/static/dashboard.html'));
	} 
	else {
		res.send("");
	}
});



// post login api
app.post('/login', function(req, res) {
	
	var username = req.body.user;
	var pass = req.body.password;
	
	console.log(username);
	console.log(pass);
	
	if(isAlphaNumeric(username) == true) {
		
		os_chat_open_db("master.db", function(db) {
		
			let sql = 'SELECT * FROM user_account';

			db.all(sql, [], (err, rows) => {
			
				if (err) {
					throw err;
				}
			
				//console.log(rows);
				
				for (const item of rows) {
					
					console.log(item);
					
					if(item['g_username'] == username) {
						
						bcrypt.compare(pass, item['g_password'], function(err, result) {
							
							console.log(pass);
							console.log(item['g_password']);
							console.log(result);
							
							if(result == true) {
						
								var sess = req.session;
								sess.user = username;
								res.json({ "status": 200 });
							}
							else {
						
								res.json({ "status": 400 });
							}						
						});		
					}
				}
			});

			db.close();			
		});		
	}
	else {
		
		res.json({ "status": 400 });
	}
});


// post message api
app.post('/message', function(req, res) {
	
	
	var ssn = req.session; 
	if(ssn.user) {
		
		var g_type = req.body.g_type;
		if(g_type == 'get_channel_list') {
			
			
			os_chat_open_db("master.db", function(db) {
			
				let sql = 'SELECT * FROM user_account';

				db.all(sql, [], (err, items) => {
				
					if (err) {
						throw err;
					}
					
					var array = [];
					for (const item of items) {
					
						array.push(item['g_username']);
					}				
					
					res.json({ "user_list":array, "status": 200 });
				});

				db.close();				
			});
		}	
		else if(g_type == 'get_user_data') {
			
			res.json({ "username":ssn.user, "status": 200 });
		}
		else if(g_type == 'send_channel_message') {
			
			
			res.json({ "status": 200 });
			
			var current_user = ssn.user;
			var to_user = req.body.g_username.replace('@', '');
			var g_message = req.body.g_message;
			console.log(current_user);
			console.log(to_user);
			console.log(g_message);
			var g_messageT = Buffer.from(g_message, 'base64').toString('ascii');
			console.log(g_messageT);
			
			// check 
			symbl_generate_token(function (g_obj) {

				// -1.0 => x > -0.3	negative
				// -0.3 => x <= 0.3	neutral
				// 0.3 < x <= 1.0	positive
				
				var authToken = g_obj.accessToken;
				
				// send text & get conversation ID
				symbl_submit_text(authToken, g_messageT, function (obj) {
					
					
					const conversationId = obj.conversationId;
					console.log(conversationId);

					symbl_get_conversation_info(authToken, conversationId, function (gobj) {
						
						for (const item of gobj.messages) {
							
							var g_sentiment_value = item['text'];
							var g_sentiment_message = item['sentiment']['polarity']['score'];
							console.log(".. text " + g_sentiment_value);
							console.log(".. sentiment score " + g_sentiment_message);			
							
							if(g_sentiment_value) {
							
								// add to db
								os_chat_open_db("master.db", function(db) {
						
									console.log(db);

									db.run('INSERT INTO group_chat(g_group_id, g_user_id, g_message, g_sentiment_value, g_sentiment_message) VALUES(?, ?, ?, ?, ?)', [to_user, current_user, 'type_sentiment', g_sentiment_message.toString(), g_sentiment_value.toString()], (err) => {
										if(err) {
											console.log(err.message); 
										}
										console.log('added to the table: ${this.lastID}');
									})	

									db.close();
								});		
							}							
						}						
					});
				});
			});	
			
			
			// add to db
			os_chat_open_db("master.db", function(db) {

				console.log(db);

				db.run('INSERT INTO group_chat(g_group_id, g_user_id, g_message, g_sentiment_value, g_sentiment_message) VALUES(?, ?, ?, ?, ?)', [to_user, current_user, g_messageT, 'null', 'null'], (err) => {
					if(err) {
						console.log(err.message); 
					}
					console.log('added to the table: ${this.lastID}');
				})	

				db.close();
			});			
		}
		else if(g_type == 'get_channel_messages') {
			
			var channel_name = req.body.channel_name.replace('@', '');
			console.log(channel_name);			
			
			os_chat_open_db("master.db", function(db) {
			
				let sql = 'SELECT * FROM group_chat';

				db.all(sql, [], (err, items) => {
				
					if (err) {
						throw err;
					}
					
					var array = [];
					for (const item of items) {
					
						if(item['g_group_id'] == channel_name) {
							
							array.push(item);
						}
					}				
					
					res.json({ "channel_messages":array, "status": 200 });
				});	
				
				db.close();
			});		
		}
		else if(g_type == 'get_channel_messages') {
			
		}
	}
	else {
		
		res.json({ "status": 400 });
	}
});


// post signup api
app.post('/signup', function(req, res) {
	
	var g_username = req.body.g_username;
	var g_password = req.body.g_password;
	var g_name = req.body.g_name;
	var g_email = req.body.g_email;

	os_chat_signup(g_username, g_name, g_email, g_password, function(obj) {
		
		res.json({ "status": 200 });
	});	
});


// destroy session
app.get('/logout', function(req, res) {
	
	req.session.destroy(function(err) {
		if(err) {
			console.log(err);
		} 
		else {
			res.redirect('/login');
		}
	});
});


server.listen(8000);

