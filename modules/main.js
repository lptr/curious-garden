var queryServer = function(method, data, callback) {
	$.ajax("https://script.google.com/macros/s/AKfycbzr__tdtQoB4Hg9mJOCaK8Y9AL8Fwx4uyIxHefJSis/dev",
	{
		dataType: "jsonp",
		data: {
			method: method,
			data: JSON.stringify(data)
		},
		success: function(data) {
			callback(data);
		},
		error: function (xhr, error, exception) {
			console.log("Error", xhr, error, exception);
			alert("Error: " + error);
		}
	});
}
