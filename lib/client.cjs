/* global __resourceQuery */

"use strict";

const params = new URLSearchParams(__resourceQuery.substr(1));
const urlBase = __webpack_public_path__ + params.get('baseUri');
console.log(urlBase);

if (typeof EventSource !== "function") {
	throw new Error(
		"Environment doesn't support lazy compilation (requires EventSource)"
	);
}

var activeEventSource;
var activeKeys = new Map();
var errorHandlers = new Set();

var updateEventSource = function updateEventSource() {
	if (activeEventSource) activeEventSource.close();
	if (activeKeys.size) {
		activeEventSource = new EventSource(
			urlBase + Array.from(activeKeys.keys()).join("@")
		);
		activeEventSource.onerror = function (event) {
			errorHandlers.forEach(function (onError) {
				onError(
					new Error(
						"Problem communicating active modules to the server: " +
							event.message +
							" " +
							event.filename +
							":" +
							event.lineno +
							":" +
							event.colno +
							" " +
							event.error
					)
				);
			});
		};
	} else {
		activeEventSource = undefined;
	}
};

exports.keepAlive = function (options) {
	var data = options.data;
	var onError = options.onError;
	var active = options.active;
	var module = options.module;
	errorHandlers.add(onError);
	var value = activeKeys.get(data) || 0;
	activeKeys.set(data, value + 1);
	if (value === 0) {
		updateEventSource();
	}
	if (!active && !module.hot) {
		console.log(
			"Hot Module Replacement is not enabled. Waiting for process restart..."
		);
	}

	return function () {
		errorHandlers.delete(onError);
		setTimeout(function () {
			var value = activeKeys.get(data);
			if (value === 1) {
				activeKeys.delete(data);
				updateEventSource();
			} else {
				activeKeys.set(data, value - 1);
			}
		}, 1000);
	};
};
