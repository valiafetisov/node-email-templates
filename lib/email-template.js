'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _path = require('path');

var _juice = require('juice');

var _juice2 = _interopRequireDefault(_juice);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _assign = require('lodash/assign');

var _assign2 = _interopRequireDefault(_assign);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debug2.default)('email-templates:email-template');

var EmailTemplate = function () {
  function EmailTemplate(path) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, EmailTemplate);

    this.files = {};
    this.path = path;
    this.dirname = (0, _path.basename)(path);
    this.options = options;
    debug('Creating Email template for path %s', (0, _path.basename)(path));
  }

  _createClass(EmailTemplate, [{
    key: '_init',
    value: function _init() {
      var _this = this;

      if (this.isInited) return _bluebird2.default.resolve();

      debug('Initializing templates');
      return (0, _util.ensureDirectory)(this.path).then(function () {
        return _this._loadTemplates();
      }).then(function () {
        _this.isInited = true;
        debug('Finished initializing templates');
      });
    }
  }, {
    key: '_loadTemplates',
    value: function _loadTemplates() {
      var _this2 = this;

      return _bluebird2.default.map(['html', 'text', 'style', 'subject'], function (type) {
        return (0, _util.readContents)(_this2.path, type);
      }).then(function (files) {
        var _files = _slicedToArray(files, 4);

        var html = _files[0];
        var text = _files[1];
        var style = _files[2];
        var subject = _files[3];


        if (!html && !text) {
          var err = new Error('Neither html nor text template files found or are both empty in path ' + _this2.dirname);
          err.code = 'ENOENT';
          throw err;
        }

        if (html) {
          debug('Found HTML file %s in %s', (0, _path.basename)(html.filename), _this2.dirname);
        }
        _this2.files.html = html;

        if (text) {
          debug('Found text %s file in %s', (0, _path.basename)(text.filename), _this2.dirname);
        }
        _this2.files.text = text;

        if (style) {
          debug('Found stylesheet %s in %s', (0, _path.basename)(style.filename), _this2.dirname);
        }
        _this2.files.style = style;

        if (subject) {
          debug('Found subject %s in %s', (0, _path.basename)(subject.filename), _this2.dirname);
        }
        _this2.files.subject = subject;

        debug('Finished loading template');
      });
    }
  }, {
    key: 'renderText',
    value: function renderText(locals, callback) {
      var _this3 = this;

      debug('Rendering text');
      return this._init().then(function () {
        if (!_this3.files.text) return null;
        return (0, _util.renderFile)(_this3.files.text, locals);
      }).tap(function () {
        return debug('Finished rendering text');
      }).nodeify(callback);
    }
  }, {
    key: 'renderSubject',
    value: function renderSubject(locals, callback) {
      var _this4 = this;

      debug('Rendering subject');
      return this._init().then(function () {
        if (!_this4.files.subject) return null;
        return (0, _util.renderFile)(_this4.files.subject, locals);
      }).tap(function () {
        return debug('Finished rendering subject');
      }).nodeify(callback);
    }
  }, {
    key: 'renderHtml',
    value: function renderHtml(locals, callback) {
      var _this5 = this;

      debug('Rendering HTML');
      return this._init().then(function () {
        return _bluebird2.default.all([(0, _util.renderFile)(_this5.files.html, locals), _this5._renderStyle(locals)]);
      }).then(function (results) {
        var _results = _slicedToArray(results, 2);

        var html = _results[0];
        var style = _results[1];

        if (!style) return html;
        if (_this5.options.juiceOptions) {
          debug('Using juice options ', _this5.options.juiceOptions);
        }
        var rendered = _juice2.default.inlineContent(html, style, _this5.options.juiceOptions || {});

        // inline style into rendered html
        var $ = _cheerio2.default.load(rendered);
        var $appendTo = null;
        if (_this5.options.juiceOptions.insertPreservedExtraCss !== true) {
          $appendTo = $(options.insertPreservedExtraCss);
        } else {
          $appendTo = $('head');
          if (!$appendTo.length) $appendTo = $('body');
          if (!$appendTo.length) $appendTo = $.root();
        }
        $appendTo.first().append('<style>' + style + '</style>');

        return $.html();
      }).tap(function () {
        return debug('Finished rendering HTML');
      }).nodeify(callback);
    }
  }, {
    key: 'render',
    value: function render(locals, callback) {
      if ((0, _isFunction2.default)(locals)) {
        callback = locals;
        locals = {};
      }
      debug('Rendering template with locals %j', locals);

      return _bluebird2.default.all([this.renderHtml(locals), this.renderText(locals), this.renderSubject(locals)]).then(function (rendered) {
        var _rendered = _slicedToArray(rendered, 3);

        var html = _rendered[0];
        var text = _rendered[1];
        var subject = _rendered[2];

        return {
          html: html, text: text, subject: subject
        };
      }).nodeify(callback);
    }
  }, {
    key: '_renderStyle',
    value: function _renderStyle(locals) {
      var _this6 = this;

      return new _bluebird2.default(function (resolve) {
        // cached
        if (_this6.style !== undefined) return resolve(_this6.style);

        // no style
        if (!_this6.files.style) return resolve(null);

        if (_this6.options.sassOptions) {
          locals = (0, _assign2.default)({}, locals, _this6.options.sassOptions);
        }

        debug('Rendering stylesheet');
        resolve((0, _util.renderFile)(_this6.files.style, locals)).then(function (style) {
          _this6.style = style;
          debug('Finished rendering stylesheet');
          return style;
        });
      });
    }
  }]);

  return EmailTemplate;
}();

exports.default = EmailTemplate;