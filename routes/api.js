module.exports = function(app, keystone) {
	var async = require('async');
	var Story = keystone.list('Story');
	var StoryTag = keystone.list('StoryTag');
	var storiesPerPage = 20;
	var mandrillapi = require('mandrill-api');

	var mandrill = new mandrillapi.Mandrill(keystone.get('mandrill api key'));

	var saveStory = function (argument) {
		
	};

	var sendEmail = function (story) {
		var adminMessage = {
		    "html": "Story: "+story.story+"<br/><br/> Author: "+story.authorName+"<br/><br/> Story on site: <a href=http://debat.100aaret.dk/story/"+story._id+" target=_blank>http://debat.100aaret.dk/story/"+story._id+"</a><br/><br/> See in CMS: <a href=http://debat.100aaret.dk/keystone/stories/"+story._id+" target=_blank>http://debat.100aaret.dk/keystone/stories/"+story._id+"</a>",
		    "text": "Story: "+story.story+"\n\n Author: "+story.authorName+"\n\n Story on site: http://debat.100aaret.dk/story/"+story._id+"\n\n See in CMS: http://debat.100aaret.dk/keystone/stories/"+story._id,
		    "subject": "New story from: "+story.authorName,
		    "from_email": "noreply@100aaret.dk",
		    "from_name": "Ta lige stilling!",
		    "to": [{
		            "email": "tagligestilling@kontrapunkt.com",
		            "name": "Tag lige stilling!",
		            "type": "to"
		        },],
		    "headers": {
		        "Reply-To": "tagligestilling@kontrapunkt.com",
		    }
		};
		var userMessage = {
		    "html": "Din historie er med til at sætte fokus på ligestilling, demokrati og deltagelse. <br/><br/>Du finder dit personlige bidrag her <a href=http://debat.100aaret.dk/story/"+story._id+" target=_blank>http://debat.100aaret.dk/story/"+story._id+"</a><br/><br/>Har du spørgsmål, er du velkommen til at sende en mail til websitets moderator, som vil besvare din henvendelse inden for 3 arbejdsdage: moderator@kontrapunkt.com<br/><br/>Tak for din deltagelse.",
		    "text": "Din historie er med til at sætte fokus på ligestilling, demokrati og deltagelse. \n\nDu finder dit personlige bidrag her http://debat.100aaret.dk/story/"+story._id+"\n\nHar du spørgsmål, er du velkommen til at sende en mail til websitets moderator, som vil besvare din henvendelse inden for 3 arbejdsdage: moderator@kontrapunkt.com\n\nTak for din deltagelse.",
		    "subject": "Tak for dit bidrag!",
		    "from_email": "noreply@100aaret.dk",
		    "from_name": "Ta lige stilling!",
		    "to": [{
		            "email": story.email,
		            "name": story.authorName,
		            "type": "to"
		        },],
		    "headers": {
		        "Reply-To": "noreply@100aaret.dk",
		    }
		};
		mandrill.messages.send({"message": adminMessage}, function(result) {
		    console.log(result);
			mandrill.messages.send({"message": userMessage}, function(result) {
			    console.log(result);
			}, function(e) {
			    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
			});
		}, function(e) {
		    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
		});
	};


	app.post('/api/stories', function(req, res) {
		var data = req.body;
		var postedTags = data.tags;
		var tags = [];

		var image = {};

		if ( data.image ) {
			image = {
				public_id: data.image.public_id,
				version: data.image.version,
				signature: data.image.signature,
				width: data.image.width,
				height: data.image.height,
				format: data.image.format,
				resource_type: data.image.resource_type,
				url: data.image.url,
				secure_url: data.image.secure_url
			}
		}

		//Populate tags
		async.each(postedTags || [], function (postedTag, next) {
			if ( postedTag.id ) {
				tags.push(postedTag.id);
				next();
			} else {
				var newTag = new StoryTag.model({
					name:postedTag.name,
					showAsDefault:false
				});
				newTag.save(function (err, savedTag) {
					if ( ! err ) {
						tags.push(savedTag._id);
						next(err);
					} else {
						next(err);
					}
				});
			}
		}, function(err) {
			if ( ! err ) {
				var story = new Story.model({
					state:'published',
					tags: tags,
					story: data.story,
					email:data.email,
					facebookId:data.facebookId,
					authorName:data.authorName,
					youtube:data.youtube,
					image:image,
					author:data.author
				});

				story.save(function (err, savedStory) {
					if ( ! err ) {
						res.json({
							result:'ok',
							story: savedStory
						});

						//Send email
						sendEmail(savedStory);
					} else {
						res.json( {
							result:'error',
							error:err
						});
					}
				});
			}
		});
	});

	app.post('/api/stories/:storyId/poll', function (req, res) {
		var selectedAnswer = 'answer' + Number(req.body.answerId) + 'Votes';

		var dynSet = {$inc: {}};
		dynSet.$inc[selectedAnswer] = 1;

		Story.model.update({'_id':req.params.storyId}, dynSet, function(err, story) {
			if(!err) {
				res.json({
					result:'ok',
					story: story
				});
			} else {
				res.json({
					result:'error',
					error: err
				});
			}
		});
	});

	app.get('/api/stories', function (req, res) {
		var page = req.query.page || 0;

		Story.model.find({state:'published'}).sort('order submitDate').limit(storiesPerPage).skip(page*storiesPerPage).exec(function(err, stories) {
			if ( ! err ) {
				res.json(stories);
			} else {
				res.json({
					result:'error',
					error:err
				});
			}
		});
	});

	app.get('/api/stories/:storyId', function (req, res) {
		Story.model.findOne({_id:req.params.storyId}).exec(function(err, story) {
			if ( ! err ) {
				res.json(story);
			} else {
				res.json({
					result:'error',
					error:err
				});
			}
		});
	});
	
	app.get('/api/stories/tag/:tagId', function (req, res) {
		var page = req.query.page || 0;

		Story.model.find({state:'published', tags:req.params.tagId}).limit(storiesPerPage).skip(page*storiesPerPage).exec(function(err, story) {
			if ( ! err ) {
				res.json(story);
			} else {
				res.json({
					result:'error',
					error:err
				});
			}
		});
	});

	app.get('/api/tags/search/:tagName', function(req, res) {
		var tagName = decodeURIComponent(req.params.tagName);
		StoryTag.model.findOne({name:tagName}).exec(function(err, tag) {
			if ( ! err && tag ) {
				if ( tag ) {
					console.log('tag');
					console.log(tag);

					Story.model.count().where('tags').in([tag._id]).exec(function(err2, count) {
						if ( ! err2 ) {
							res.json({
								result:'ok',
								tag: tag,
								storyCount:count
							});
						} else {
							res.json({
								result:'error',
								error:err2
							})
						}
					});

				} else {
					res.json({
						result:'notFound'
					});
				}
			} else {
				res.json({
					result:'err',
					err:err
				});
			}
		});
	});
};