
var fs = require('fs');
var request = require('supertest');
var should = require('should');
var Router = require('koa-router');
var range = require('../');
var Koa = require('koa');
var app = new Koa();

var router = new Router();
var rawbody = new Buffer(1024);
var rawFileBuffer = fs.readFileSync('./README.md') + '';

app.use(range);

router.get('/',  function*() {
  this.body = rawbody;
});
router.post('/',  function*() {
  this.status = 200;
});
router.get('/json',  function*() {
  this.body = {foo:'bar'};
});
router.get('/string',  function*() {
  this.body = 'koa-range';
});
router.get('/stream',  function*() {
  this.body = fs.createReadStream('./README.md');
});
router.get('/empty',  function*() {
  this.body = undefined;
  this.status = 304;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.on('error', function(err) {
  throw err;
});

describe('normal requests', function() {

  it('should return 200 without range', function(done) {
    request(app.listen())
    .get('/')
    .expect('Accept-Ranges', 'bytes')
    .expect(200)
    .end(done);
  });

  it('should return 200 when method not GET', function(done) {
    request(app.listen())
    .post('/')
    .set('range', 'bytes=0-300')
    .expect('Accept-Ranges', 'bytes')
    .expect(200)
    .end(done);
  });

});

describe('range requests', function() {

  it('should return 206 with partial content', function(done) {
    request(app.listen())
    .get('/')
    .set('range', 'bytes=0-299')
    .expect('Content-Length', '300')
    .expect('Accept-Ranges', 'bytes')
    .expect('Content-Range', 'bytes 0-299/1024')
    .expect(206)
    .end(done);
  });

  it('should return 400 with PUT', function(done) {
    request(app.listen())
    .put('/')
    .set('range', 'bytes=0-299')
    .expect('Accept-Ranges', 'bytes')
    .expect(400)
    .end(done);
  });

  it('should return 416 with invalid range', function(done) {
    request(app.listen())
    .get('/')
    .set('range', 'bytes=400-300')
    .expect('Accept-Ranges', 'bytes')
    .expect(416)
    .end(done);
  });

  it('should return 416 with invalid range', function(done) {
    request(app.listen())
    .get('/')
    .set('range', 'bytes=x-300')
    .expect('Accept-Ranges', 'bytes')
    .expect(416)
    .end(done);
  });

  it('should return 416 with invalid range', function(done) {
    request(app.listen())
    .get('/')
    .set('range', 'bytes=400-x')
    .expect('Accept-Ranges', 'bytes')
    .expect(416)
    .end(done);
  });

  it('should return 416 with invalid range', function(done) {
    request(app.listen())
    .get('/')
    .set('range', 'bytes')
    .expect('Accept-Ranges', 'bytes')
    .expect(416)
    .end(done);
  });

});

describe('range requests with stream', function() {

  it('should return 206 with partial content', function(done) {
    request(app.listen())
    .get('/stream')
    .set('range', 'bytes=0-99')
    .expect('Transfer-Encoding', 'chunked')
    .expect('Accept-Ranges', 'bytes')
    .expect('Content-Range', 'bytes 0-99/*')
    .expect(206)
    .end(function(err, res) {
      should.not.exist(err);
      res.text.should.equal(rawFileBuffer.slice(0, 100));
      done();
    });
  });

  it('should return 206 with open ended range', function(done) {
    request(app.listen())
    .get('/stream')
    .set('range', 'bytes=0-')
    .expect('Transfer-Encoding', 'chunked')
    .expect(200)
    .end(function(err, res) {
      should.not.exist(err);
      res.text.should.startWith(rawFileBuffer.slice(0, 300));
      done();
    });
  });

});

describe('range requests with json', function() {

  it('should return 206 with partial content', function(done) {
    request(app.listen())
    .get('/json')
    .set('range', 'bytes=0-5')
    .expect('Accept-Ranges', 'bytes')
    .expect('Content-Range', 'bytes 0-5/13')
    .expect('Content-Length', '6')
    .expect(206)
    .end(function(err, res) {
      should.not.exist(err);
      res.text.should.equal('{"foo"');
      done();
    });
  });

  it('should return 206 with single byte range', function(done) {
    request(app.listen())
    .get('/json')
    .set('range', 'bytes=2-2')
    .expect('Accept-Ranges', 'bytes')
    .expect('Content-Range', 'bytes 2-2/13')
    .expect('Content-Length', '1')
    .expect(206)
    .end(function(err, res) {
      should.not.exist(err);
      res.text.should.equal('f');
      done();
    });
  });
});

describe('range requests with string', function() {

  it('should return 206 with partial content', function(done) {
    request(app.listen())
    .get('/string')
    .set('range', 'bytes=0-5')
    .expect('Accept-Ranges', 'bytes')
    .expect('Content-Range', 'bytes 0-5/9')
    .expect('Content-Length', '6')
    .expect(206)
    .end(function(err, res) {
      should.not.exist(err);
      res.text.should.equal('koa-ra');
      done();
    });
  });

  it('should return 206 with open ended range', function(done) {
    request(app.listen())
    .get('/string')
    .set('range', 'bytes=3-')
    .expect('Accept-Ranges', 'bytes')
    .expect('Content-Range', 'bytes 3-8/9')
    .expect('Content-Length', '6')
    .expect(206)
    .end(function(err, res) {
      should.not.exist(err);
      res.text.should.equal('-range');
      done();
    });
  });
});

describe('range requests with empty body', function() {
  it('should return 304', function(done) {
    request(app.listen())
    .get('/empty')
    .set('range', 'bytes=1-')
    .expect(304)
    .end(function(err, res) {
      should.not.exist(err);
      done();
    });
  });
});

