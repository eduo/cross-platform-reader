/**
 * ReaderJS v1.0.0
 * (c) 2013 BlinkboxBooks
 * display.js: methods for create the container and display the content
 */

/* jshint unused: true */
/* exported Reader */
/* globals $, Bugsense */

var Reader = (function (r) {
	'use strict';

	// **Init function**
	//
	// Assign parameters to the global variables.
	//
	// * `param` Contains the parameters: container (id), chapters, padding, url, mobile, dimensions (width and height) etc.
	r.init = function(param) {
		r.reset();

		if (!param) {
			param = {};
		}

		// Take the params {container, chapters, width, height, padding, _mobile} or create them.
		// todo validate container
		r.$parent = $(param.container).empty();

		// default to iframe, unless explicitly set to false.
		r.iframe = param.iframe !== false;
		if(r.iframe){
			r.$iframe = $('<iframe id="cpr-iframe" name="reader" scrolling="no" seamless="seamless" src="javascript:undefined;"></iframe>').appendTo(r.$parent);
		} else {
			r.$iframe = $('<div id="cpr-iframe"></div>').appendTo(r.$parent);
		}

		r.$document = r.$iframe.contents();
		r.document = r.iframe ? r.$document[0] : window.document;
		r.$head = r.iframe ? r.$document.find('head') : $('head');
		r.$wrap = r.iframe ? r.$document.find('body') : $('#cpr-iframe');
		r.$container = $('<div></div>').appendTo(r.$wrap);
		r.$reader = $('<div id="cpr-reader"></div>').appendTo(r.$container);
		r.$header = $('<div id="cpr-header"></div>').insertBefore(r.$container);
		r.$footer = $('<div id="cpr-footer"></div>').insertAfter(r.$container);

		// Add bookmark mark
		$('<span id="cpr-bookmark-ui"></span>').insertAfter(r.$container);

		// add styles and fonts
		_addStyles();

		r.listener = (param.hasOwnProperty('listener')) ? param.listener : null;

		r.DOCROOT = (param.hasOwnProperty('url')) ? param.url : '';
		r.ISBN = (param.hasOwnProperty('isbn')) ? param.isbn : '';

		// Set the mobile flag.
		r.mobile = !!((param.hasOwnProperty('mobile')));

		// Initialise the epub module
		r.Epub.init(r.$reader[0]);

		// Initialize the touch module:
		r.Touch.init($(r.document));

		// Resize the container with the width and height (if they exist).
		_createContainer(param.width, param.height, param.columns, param.padding);

		// Apply all user preferences
		r.setPreferences(param.preferences);

		// Set initial transition timing function:
		r.$reader.css('transition-timing-function', r.preferences.transitionTimingFunction.value);

		r.support = {
			transitionend: _getTransitionEndProperty()
		};

		r.Layout.resizeContainer(param);

		// Enable bugsense reporting
		_setBugsense();

		// Start the party:
		return r.Book.load(param.book).then(function (book) {
			// Save the initial bookmarks and highlights.
			r.Bookmarks.setBookmarks((param.hasOwnProperty('bookmarks')) ? param.bookmarks : [], true);
			r.Highlights.setHighlights((param.hasOwnProperty('highlights')) ? param.highlights : [], true);

			return initializeBook(book, param);
		});
	};

	function _getTransitionEndProperty() {
		var element= r.document.createElement('div');
		if (element.style.webkitTransition !== undefined) {
			return 'webkitTransitionEnd';
		}
		if (element.style.MozTransition !== undefined) {
			return 'transitionend';
		}
		if (element.style.OTransition !== undefined) {
			return 'otransitionend';
		}
		if (element.style.transition !== undefined) {
			return 'transitionend';
		}
	}

	function _addStyles() {
		var styles = 'html{font-family:sans-serif;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}article,aside,details,figcaption,figure,footer,header,hgroup,main,menu,nav,section,summary{display:block}audio,canvas,progress,video{display:inline-block;vertical-align:baseline}audio:not([controls]){display:none;height:0}[hidden],template{display:none}a{background-color:transparent}a:active,a:hover{outline:0}abbr[title]{border-bottom:1px dotted}b,strong{font-weight:700}dfn{font-style:italic}mark{background:#ff0;color:#000}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sup{top:-.5em}sub{bottom:-.25em}img{border:0}svg:not(:root){overflow:hidden}figure{margin:1em 40px}hr{-moz-box-sizing:content-box;box-sizing:content-box;height:0}pre{overflow:auto}code,kbd,pre,samp{font-family:monospace,monospace;font-size:1em}button,input,optgroup,select,textarea{color:inherit;font:inherit;margin:0}button{overflow:visible}button,select{text-transform:none}button,html input[type=button],input[type=reset],input[type=submit]{-webkit-appearance:button;cursor:pointer}button[disabled],html input[disabled]{cursor:default}button::-moz-focus-inner,input::-moz-focus-inner{border:0;padding:0}input{line-height:normal}input[type=checkbox],input[type=radio]{box-sizing:border-box;padding:0}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{height:auto}input[type=search]{-webkit-appearance:textfield;-moz-box-sizing:content-box;-webkit-box-sizing:content-box;box-sizing:content-box}input[type=search]::-webkit-search-cancel-button,input[type=search]::-webkit-search-decoration{-webkit-appearance:none}fieldset{border:1px solid silver;margin:0 2px;padding:.35em .625em .75em}legend{border:0;padding:0}textarea{overflow:auto}optgroup{font-weight:700}table{border-collapse:collapse;border-spacing:0}td,th{padding:0}#cpr-bookmark-ui{display:none;position:absolute;right:0;top:0;background:#111;width:30px;height:30px;box-shadow:0 0 3px #666}#cpr-bookmark-ui::before{position:absolute;content:"";right:0;top:0;width:0;height:0;border:15px solid #000;border-right-color:transparent;border-top-color:transparent}#cpr-footer{color:#000;line-height:30px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:18px;font-family:sans-serif}#cpr-header{color:#000;line-height:30px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;font-size:18px;font-family:sans-serif}.cpr-placeholder{visibility:hidden;width:auto;height:100%}*{box-sizing:border-box}html{font-size:18px}body{background:#fff;color:#000;position:relative;overflow:hidden;word-wrap:break-word;font-family:sans-serif;font-weight:400;font-style:normal;text-decoration:none;text-align:left;line-height:1.2;padding:0;margin:0;font-size:1rem}body #cpr-reader{-webkit-backface-visibility:hidden;-webkit-perspective:1000;backface-visibility:hidden;perspective:1000;will-change:transform,opacity}h1,h2,h3,h4,h5,h6{font-weight:700;line-height:1.2;margin:0 0 .67em;clear:both}h1{font-size:1.5rem}h2{font-size:1.4rem}h3{font-size:1.3rem}h4{font-size:1.2rem}h5{font-size:1.1rem}h6{font-size:1rem}p{margin:0 0 1rem}div:last-child,p:last-child{margin-bottom:0}blockquote{border-left:4px solid #e1e1e1;padding:0 1rem 0 1.4rem}:link{color:#09f;text-decoration:underline}:link[data-link-type=external]:after{content:"";background:url(data:image/png;base64,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WHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDx4bXA6TW9kaWZ5RGF0ZT4yMDE0LTA1LTI4VDA5OjU4OjE5PC94bXA6TW9kaWZ5RGF0ZT4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ0MgKE1hY2ludG9zaCk8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhtcDpDcmVhdGVEYXRlPjIwMTMtMDgtMDhUMTA6MTI6MzU8L3htcDpDcmVhdGVEYXRlPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICAgICAgICAgPHRpZmY6WFJlc29sdXRpb24+NzI8L3RpZmY6WFJlc29sdXRpb24+CiAgICAgICAgIDxleGlmOkNvbG9yU3BhY2U+MTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+NjAwPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjY0MDc8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4K/AFthgAAAJhJREFUOBHNklEOgCAIhjG7VXWdOlOdx47lLHRuxBgT50O9BPj3AX8CDHoccvyVAiRYGpkhHm7j2ikX2iEoXzkE85kW3055QlqjsT9TojmNPyB6IMVaIxHU41nxiLfv8EycqHK1VVBDPZMnqiTD++cgurNhqywtqzm4rR9yff5rcXfitediLR9mtnqPLJ7JE1k8s2g1b+rZA2oNIaRRHfQPAAAAAElFTkSuQmCC) 0 0 no-repeat;background-size:cover;width:.6rem;height:.6rem;display:inline-block;vertical-align:top;margin:0 0 0 .2rem}:link *{color:#09f}img,svg,svg *{max-width:100%;max-height:100%}img.cpr-img-large,svg .cpr-img-large,svg.cpr-img-large{display:inline-block;margin:0 auto .5rem}img.cpr-img-large:last-child,svg .cpr-img-large:last-child,svg.cpr-img-large:last-child{margin-bottom:0}img.cpr-img-large .cpr-subchapter-link,svg .cpr-img-large .cpr-subchapter-link,svg.cpr-img-large .cpr-subchapter-link{display:none}img.cpr-img-medium,svg .cpr-img-medium,svg.cpr-img-medium{margin:0 .5rem .5rem 0}img.cpr-img-small,svg .cpr-img-small,svg.cpr-img-small{display:inline}.cpr-highlight div{position:absolute;top:0;left:0;display:inline-block;background:#ff0;opacity:.2}';

		var $style = $('<style>' + styles + '</style>').appendTo(r.$head);

		// Save a reference for each style
		var rules = $style[0].sheet.cssRules;
		var i, l= rules.length;
		for(i=0; i< l; i++){
			var rule = rules[i];
			if(rule.selectorText === 'html'){
				r.preferences.fontSize.rules.push({rule: rule.style, property: 'fontSize'});
			} else if(rule.selectorText === 'body'){
				r.preferences.lineHeight.rules.push({rule: rule.style, property: 'lineHeight'});
				r.preferences.fontFamily.rules.push({rule: rule.style, property: 'fontFamily'});
				r.preferences.textAlign.rules.push({rule: rule.style, property: 'textAlign'});
				r.preferences.theme.rules.color.push({rule: rule.style, property: 'color'});
				r.preferences.theme.rules.background.push({rule: rule.style, property: 'background'});
			} else if(rule.selectorText === '#cpr-header' || rule.selectorText === '#cpr-footer'){
				r.preferences.theme.rules.title.push({rule: rule.style, property: 'color'});
			} else if(rule.selectorText === '#cpr-bookmark-ui'){
				r.preferences.theme.rules.background.push({rule: rule.style, property: 'background'});
			}
		}

		// Note, this is injected regardless if it exists or not
		if(!r.mobile){
			r.$head.append('<link href=\'//fonts.googleapis.com/css?family=Droid+Serif:400,700,700italic,400italic\' rel=\'stylesheet\' type=\'text/css\'>');
		}
	}

	function _setBugsense() {
		if (typeof Bugsense === 'function') {
			r.Bugsense = new Bugsense({
				apiKey: 'f38df951',
				appName: 'CPR',
				appversion: '@@readerVersion'
			});
			// Setup error handler
			window.onerror = function (message, url, line) {
				r.Notify.error(message, url, line);
				return false;
			};
		}
	}

	function _highlightHandler(e){
		var x = e.type === 'touchstart' ? e.originalEvent.touches[0].clientX : e.clientX,
			y = e.type === 'touchstart' ? e.originalEvent.touches[0].clientY : e.clientY;

		/*jshint validthis:true */
		r.Notify.event($.extend({}, Reader.Event.HIGHLIGHT_TAPPED, {call: 'userClick', cfi: $(this).attr('data-cfi'), clientX: x, clientY: y}));
		e.preventDefault();
		e.stopPropagation();
	}

	// Capture all the links in the reader
	function _clickHandler(e) {
		/*jshint validthis:true */
		// Retrieve the encoded relative version of the url:
		var url = this.getAttribute('href'),
				type = this.getAttribute('data-link-type');
		e.preventDefault();
		e.stopPropagation();
		if (type === 'external') {
			// External link, notify client about it:
			r.Notify.event($.extend({}, Reader.Event.NOTICE_EXT_LINK, {call: 'userClick', href: url}));
		} else if (type === 'internal') {
			url = this.href.split('/').slice(-url.split('/').length).join('/');
			// Internal link, notify client about it:
			r.Notify.event($.extend({}, Reader.Event.NOTICE_INT_LINK, {call: 'userClick', href: url}));
			// Load the given URL:
			r.Notify.event(r.Event.LOADING_STARTED);
			r.Navigation.loadChapter(url)
				.always(function () {
					r.Notify.event(r.Event.LOADING_COMPLETE);
				})
				.done(function () {
					r.Notify.event($.extend({}, Reader.Event.getStatus(), {call: 'clickLoad', href: url}));
				})
				.fail(function (error) {
					if (error && error.code === r.Event.ERR_INVALID_ARGUMENT.code) {
						r.Notify.event($.extend({}, Reader.Event.CONTENT_NOT_AVAILABLE, {call: 'userClick', href: url}));
					} else {
						r.Notify.error(error);
					}
				});
		}
	}

	// Display HTML content
	//
	// * `param` Contains the parameters: content, page and mimetype
	// * `callback` Function to be called after the function's logic
	function displayContent(param) {
		if (!param) { param = {}; }
		// Take the params values
		var content = (param.hasOwnProperty('content')) ? param.content : '';
		var mimetype = (param.hasOwnProperty('mimetype')) ? param.mimetype : 'application/xhtml+xml';

		r.$header.text(r.Book.title); // TODO Do not polute the reader object.

		// Parse the content according its mime-type and apply all filters attached to display content
		var result = r.parse(content, mimetype, param);
		r.Navigation.setChapterHead(result.$head);
		var promise = r.preferences.publisherStyles.value ? r.addPublisherStyles() : $.Deferred().resolve().promise();

		return promise.then(function(){

			content = r.Filters.applyFilters(r.Filters.HOOKS.BEFORE_CHAPTER_DISPLAY, result.$body);
			r.$reader.html(content);

			r.Filters.applyFilters(r.Filters.HOOKS.AFTER_CHAPTER_DISPLAY);

			// Add all bookmarks for this chapter.
			var bookmarks = r.Bookmarks.getBookmarks()[r.Navigation.getChapter()];
			if(bookmarks){
				$.each(bookmarks, function(index, bookmark){
					// Ignore bookmarks not part of the current chapter part:
					if (bookmark && r.Navigation.isCFIInCurrentChapterPart(bookmark)) {
						r.CFI.setBookmarkCFI(bookmark);
					}
				});
			}

			// Add all highlights for this chapter
			var highlights = r.Highlights.getHighlights()[r.Navigation.getChapter()];
			if(highlights){
				$.each(highlights, function(index, highlight){
					// Ignore bookmarks not part of the current chapter part:
					if (highlight && r.Navigation.isCFIInCurrentChapterPart(highlight)) {
						r.CFI.setHighlightCFI(highlight);
					}
				});
			}
		});
	}

	// Check if the browser supports css-columns.
	function areColumnsSupported() {
		var elemStyle = r.document.createElement('ch').style,
			domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
			prop = 'columnCount',
			uc_prop = prop.charAt(0).toUpperCase() + prop.substr(1),
			props   = (prop + ' ' + domPrefixes.join(uc_prop + ' ') + uc_prop).split(' ');

		for ( var i in props ) {
			if ( elemStyle[ props[i] ] !== undefined ) {
				return true;
			}
		}
		return false;
	}

	// Define the container dimensions and create the multi column or adjust the height for the vertical scroll.
	//
	// * `width` In pixels
	// * `height` In pixels
	function _createContainer() {
		r.$iframe.css({
			display: 'inline-block',
			border: 'none'
		});

		r.$reader.addClass(areColumnsSupported() ? 'columns' : 'scroll');

		// Container parent styles.
		r.$container
			.css({
				overflow: 'hidden',
				'-webkit-tap-highlight-color': 'rgba(0,0,0,0)',
				'-webkit-touch-callout': 'none'
			});

		// Capture the anchor links into the content
		r.$container.on('click', 'a', _clickHandler);
		r.$container.on('click touchstart', '.cpr-highlight div', _highlightHandler);
		r.$container.on('touchmove touchend touchcancel', '.cpr-highlight div', function(e){
			// we need to stop all touch events on highlight markers
			e.preventDefault();
			e.stopPropagation();
		});

		// Capture text selection events and notify client of text value.
		var $doc = $(r.document);
		$doc.bind('selectionchange', function(){
			var selection = $doc[0].getSelection().toString();
			r.Notify.event($.extend({value: selection}, r.Event.TEXT_SELECTION_EVENT));
		});
	}

	function initializeBook(book, param) {
		var defer = $.Deferred();
		// Use startCFI if initCFI is not already set:
		var initCFI = param.initCFI || book.startCfi;
		var chapter = r.CFI.getChapterFromCFI(initCFI),
				promise;
		// Validate initCFI (chapter exists):
		if (chapter === -1 || chapter >= book.spine.length) {
			chapter = 0;
			initCFI = null;
		}
		if (initCFI) {
			promise = r.loadChapter(chapter, initCFI);
		} else {
			promise = param.initURL ? r.Navigation.loadChapter(param.initURL) : r.loadChapter(0);
		}
		if (r.preferences.loadProgressData.value === 2) {
			// Load the spine progress data after loading the initial chapter:
			promise.then(function () {
				r.Book.loadProgressData().then(function () {
					r.Navigation.updateProgress();
					r.Notify.event($.extend({}, Reader.Event.getStatus('progressLoad'), {call: 'progressLoad'}));
				});
			});
		}
		promise.then(
			defer.resolve,
			function (err) {
				if (err && err.call === 'goToCFI') {
					Reader.Notify.error(err);
					// The initCFI or startCfi might be invalid, try loading the book without them:
					delete param.initCFI;
					delete book.startCfi;
					initializeBook(book, param).then(defer.resolve, defer.reject);
				} else {
					defer.reject(err);
				}
			}
		);
		return defer.promise();
	}

	// Load a chapter with the index from the spine of this chapter
	r.loadChapter = function(chapterNumber, page) {
		var defer = $.Deferred(),
				chapterUrl = r.Book.spine[chapterNumber].href;

		r.Epub.setUp(chapterNumber, r.Book);
		r.Navigation.setChapter(chapterNumber);
		r.setReaderOpacity(0);

		// success handler for load chapter
		function loadChapterSuccess(data){
			// The url param is required for the chapter divide:
			displayContent({content: data, page: page, url: chapterUrl}).then(function(){

				r.Navigation.setNumberOfPages();

				var cfi = r.CFI.isValidCFI(String(page)) && page;
				if (cfi) {
					r.CFI.goToCFI(cfi).then(defer.resolve, defer.reject);
				} else {
					r.Navigation.loadPage(page).then(defer.resolve, defer.reject);
				}
			}, defer.reject); // Execute the callback inside displayContent when its timer interval finish
		}

		defer.notify({type: 'chapter.loading'});
		r.Book.loadFile(chapterUrl).then(loadChapterSuccess, defer.reject);

		return defer.promise().then(function () {
			// setReaderOpacity returns a promise, but we don't rely on the fade in
			// and the transitionend event does not seem to be fired on the Huddle,
			// so we don't return this promise:
			r.setReaderOpacity(1, r.preferences.transitionDuration.value);
		});
	};

	return r;

}(Reader || {}));
