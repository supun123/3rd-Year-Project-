var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var csrfProtection = csrf();
var mongo = require('mongodb').MongoClient;
var assert = require('assert');


var Donation = require('../models/donation');

router.use(csrfProtection);
var url = 'mongodb://localhost:27017';

const dbName= 'sahana';

router.get('/', function(req, res, next) {
    mongo.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        db.collection('donations').aggregate(
            [
                {$match:{eventId : req.session.eventID,
                status : { $in: [ "Pending", "Call Once", "Call Twice", "Confirm" ] } }
                },
                { $group : { _id : "$item", quantity: { $sum: "$amount"} } }
            ])
            .toArray(function (err, result) {
                assert.equal(null, err);
                res.render('donation', {donations: result, msgSuccess: req.flash('success')[0], layout : 'main'});
                req.flash('success')[0] = false;
                client.close();
            });
    });
});

router.get('/storedDonations', function(req, res, next) {

    mongo.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        db.collection('donations').aggregate(
            [
                {$match:{eventId : req.session.eventID,
                    status : "Success" }
                },
                { $group : { _id : "$item", quantity: { $sum: "$amount"} } }
            ])
            .toArray(function (err, result) {
                assert.equal(null, err);
                res.render('donation', {donations: result, msgSuccess: req.flash('success')[0], layout : 'main'});
                req.flash('success')[0] = false;
                client.close();
            });
    });

});

router.use('/', isLoggedIn, function(req, res, next) {
    next();
});

router.get('/addItem', function(req, res, next) {
    res.render('addItem', {csrfToken: req.csrfToken(), msgSuccess: false, messages: false, layout : 'main'});
});

router.post('/addItem', function (req, res, next) {
    req.check('itemName', 'Fill Item').notEmpty();
    req.check('amount', 'Fill Amount').notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        req.session.errors = errors;
        res.render('addItem', {csrfToken: req.csrfToken(), msgSuccess: false, messages: req.session.errors, layout : 'main'});
    }else {
        var donation = new Donation({
            donorName: req.body.donorName,
            mobile: req.body.mobile,
            phone : req.user.phone,
            item: req.body.itemName,
            amount: req.body.amount,
            eventId : req.session.eventID,
            ownerId : req.user._id,
            province : req.user.province,
            district : req.user.district,
            profileImage : req.user.profileImage,
            status : "Pending",
            colour : "default"
        });
        donation.save(function (err, result) {
            req.flash('success', 'Successfully Add your Donation!');
            res.render('addItem', {
                csrfToken: req.csrfToken(),
                msgSuccess: req.flash('success')[0],
                messages: false,
                layout: 'main'
            });
        });
    }
});


router.get('/addDonation', function(req, res, next) {
    res.render('addDonation',{csrfToken: req.csrfToken(), layout : 'main'});
});

router.get('/addDonation/:id', function(req, res, next) {
    req.session.itemName = req.params.id;
    res.redirect('/donation/addDonation');
});


router.post('/addDonation', function (req, res, next) {
    req.check('amount', 'Fill Amount').notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        req.session.errors = errors;
        res.render('addDonation', {csrfToken: req.csrfToken(), messages: req.session.errors, layout : 'main'});
    }else {
        var donation = new Donation({
            donorName: req.body.donorName,
            mobile: req.body.mobile,
            phone : req.user.phone,
            item: req.session.itemName,
            amount: req.body.amount,
            eventId : req.session.eventID,
            ownerId : req.user._id,
            province : req.user.province,
            district : req.user.district,
            profileImage : req.user.profileImage,
            status : "Pending",
            colour : "default"
        });
        donation.save(function (err, result) {
            req.flash('success', 'Successfully Add your Donation!');
            res.redirect('/donation/');
        });
    }
});

router.get('/orderedDonations', function(req, res, next) {
    mongo.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        db.collection('donations').aggregate(
            [
                {$match:{eventId : req.session.eventID, ownerId : req.session.profileId}
                },
                { $group : { _id : "$item", quantity: { $sum: "$amount"},
                    "profileImage": { "$first": "$profileImage" },
                    "donorName": { "$first": "$donorName" },
                    "mobile": { "$first": "$mobile" }
                } }
            ])
            .toArray(function (err, result) {
                assert.equal(null, err);
                res.render('profileDonations', {donations: result, layout : 'main'});
                client.close();
            });
    });

});


router.get('/myDonations', function(req, res, next) {
    req.session.donorName = req.user.firstName + " " + req.user.lastName;
    req.session.mobile = req.user.mobile;
    req.session.profileImage = req.user.profileImage;
    req.session.profileId = req.user._id;
    res.redirect('/donation/orderedDonations');
});


router.get('/userOrderedDonations', function(req, res, next) {

    mongo.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        db.collection('donations').aggregate(
            [
                {$match:{eventId : req.session.eventID,
                    ownerId : req.session.profileId,
                    status : { $in: [ "Pending", "Call Once", "Call Twice", "Confirm" ] } }
                },
                { $group : { _id : "$item", quantity: { $sum: "$amount"},
                    "profileImage": {"$first": "$profileImage"},
                    "mobile": {"$first": "$mobile" },
                    "donorName": {"$first": "$donorName" }
                } }
            ])
            .toArray(function (err, result) {
                assert.equal(null, err);
                res.render('profileDonations', {donations: result, layout : 'main'});
                client.close();
            });
    });

});


router.get('/userOfferedDonations', function(req, res, next) {

    mongo.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        db.collection('donations').aggregate(
            [
                {$match:{eventId : req.session.eventID,
                    ownerId : req.session.profileId,
                    status : "Success" }
                },
                { $group : { _id : "$item", quantity: { $sum: "$amount"},
                    "profileImage": {"$first": "$profileImage"},
                    "mobile": {"$first": "$mobile" },
                    "donorName": {"$first": "$donorName" }
                        }}
            ])
            .toArray(function (err, result) {
                assert.equal(null, err);
                res.render('profileDonations', {donations: result, layout : 'main'});
                client.close();
            });
    });

});


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/signIn');
}





module.exports = router;