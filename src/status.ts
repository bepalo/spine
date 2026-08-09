export enum Status {
	_100_Continue = 100,
	_101_SwitchingProtocols = 101,
	_102_Processing = 102,
	_103_EarlyHints = 103,
	_200_OK = 200,
	_201_Created = 201,
	_202_Accepted = 202,
	_203_NonAuthoritativeInformation = 203,
	_204_NoContent = 204,
	_205_ResetContent = 205,
	_206_PartialContent = 206,
	_207_MultiStatus = 207,
	_208_AlreadyReported = 208,
	_226_IMUsed = 226,
	_300_MultipleChoices = 300,
	_301_MovedPermanently = 301,
	_302_Found = 302,
	_303_SeeOther = 303,
	_304_NotModified = 304,
	_305_UseProxy = 305,
	_307_TemporaryRedirect = 307,
	_308_PermanentRedirect = 308,
	_400_BadRequest = 400,
	_401_Unauthorized = 401,
	_402_PaymentRequired = 402,
	_403_Forbidden = 403,
	_404_NotFound = 404,
	_405_MethodNotAllowed = 405,
	_406_NotAcceptable = 406,
	_407_ProxyAuthenticationRequired = 407,
	_408_RequestTimeout = 408,
	_409_Conflict = 409,
	_410_Gone = 410,
	_411_LengthRequired = 411,
	_412_PreconditionFailed = 412,
	_413_PayloadTooLarge = 413,
	_414_URITooLong = 414,
	_415_UnsupportedMediaType = 415,
	_416_RangeNotSatisfiable = 416,
	_417_ExpectationFailed = 417,
	_418_IMATeapot = 418,
	_421_MisdirectedRequest = 421,
	_422_UnprocessableEntity = 422,
	_423_Locked = 423,
	_424_FailedDependency = 424,
	_425_TooEarly = 425,
	_426_UpgradeRequired = 426,
	_428_PreconditionRequired = 428,
	_429_TooManyRequests = 429,
	_431_RequestHeaderFieldsTooLarge = 431,
	_451_UnavailableForLegalReasons = 451,
	_500_InternalServerError = 500,
	_501_NotImplemented = 501,
	_502_BadGateway = 502,
	_503_ServiceUnavailable = 503,
	_504_GatewayTimeout = 504,
	_505_HTTPVersionNotSupported = 505,
	_506_VariantAlsoNegotiates = 506,
	_507_InsufficientStorage = 507,
	_508_LoopDetected = 508,
	_510_NotExtended = 510,
	_511_NetworkAuthenticationRequired = 511,
	_419_PageExpired = 419,
	_420_EnhanceYourCalm = 420,
	_450_BlockedbyWindowsParentalControls = 450,
	_498_InvalidToken = 498,
	_499_TokenRequired = 499,
	_509_BandwidthLimitExceeded = 509,
	_526_InvalidSSLCertificate = 526,
	_529_Siteisoverloaded = 529,
	_530_Siteisfrozen = 530,
	_598_NetworkReadTimeoutError = 598,
	_599_NetworkConnectTimeoutError = 599,
}

export function getHttpStatusText(code: number): string {
	switch (code) {
		// 1xx Informational
		case 100:
			return 'Continue';
		case 101:
			return 'Switching Protocols';
		case 102:
			return 'Processing';
		case 103:
			return 'Early Hints';

		// 2xx Success
		case 200:
			return 'OK';
		case 201:
			return 'Created';
		case 202:
			return 'Accepted';
		case 203:
			return 'Non-Authoritative Information';
		case 204:
			return 'No Content';
		case 205:
			return 'Reset Content';
		case 206:
			return 'Partial Content';
		case 207:
			return 'Multi-Status';
		case 208:
			return 'Already Reported';
		case 226:
			return 'IM Used';

		// 3xx Redirection
		case 300:
			return 'Multiple Choices';
		case 301:
			return 'Moved Permanently';
		case 302:
			return 'Found';
		case 303:
			return 'See Other';
		case 304:
			return 'Not Modified';
		case 305:
			return 'Use Proxy';
		case 307:
			return 'Temporary Redirect';
		case 308:
			return 'Permanent Redirect';

		// 4xx Client Error
		case 400:
			return 'Bad Request';
		case 401:
			return 'Unauthorized';
		case 402:
			return 'Payment Required';
		case 403:
			return 'Forbidden';
		case 404:
			return 'Not Found';
		case 405:
			return 'Method Not Allowed';
		case 406:
			return 'Not Acceptable';
		case 407:
			return 'Proxy Authentication Required';
		case 408:
			return 'Request Timeout';
		case 409:
			return 'Conflict';
		case 410:
			return 'Gone';
		case 411:
			return 'Length Required';
		case 412:
			return 'Precondition Failed';
		case 413:
			return 'Payload Too Large';
		case 414:
			return 'URI Too Long';
		case 415:
			return 'Unsupported Media Type';
		case 416:
			return 'Range Not Satisfiable';
		case 417:
			return 'Expectation Failed';
		case 418:
			return "I'm a teapot";
		case 421:
			return 'Misdirected Request';
		case 422:
			return 'Unprocessable Entity';
		case 423:
			return 'Locked';
		case 424:
			return 'Failed Dependency';
		case 425:
			return 'Too Early';
		case 426:
			return 'Upgrade Required';
		case 428:
			return 'Precondition Required';
		case 429:
			return 'Too Many Requests';
		case 431:
			return 'Request Header Fields Too Large';
		case 451:
			return 'Unavailable For Legal Reasons';

		// 5xx Server Error
		case 500:
			return 'Internal Server Error';
		case 501:
			return 'Not Implemented';
		case 502:
			return 'Bad Gateway';
		case 503:
			return 'Service Unavailable';
		case 504:
			return 'Gateway Timeout';
		case 505:
			return 'HTTP Version Not Supported';
		case 506:
			return 'Variant Also Negotiates';
		case 507:
			return 'Insufficient Storage';
		case 508:
			return 'Loop Detected';
		case 510:
			return 'Not Extended';
		case 511:
			return 'Network Authentication Required';

		// Unofficial/Custom codes
		case 419:
			return 'Page Expired'; // Laravel Framework
		case 420:
			return 'Enhance Your Calm'; // Twitter
		case 430:
			return 'Request Header Fields Too Large'; // Shopify
		case 450:
			return 'Blocked by Windows Parental Controls'; // Microsoft
		case 498:
			return 'Invalid Token'; // Esri
		case 499:
			return 'Token Required'; // Esri
		case 509:
			return 'Bandwidth Limit Exceeded'; // Apache
		case 526:
			return 'Invalid SSL Certificate'; // Cloudflare
		case 529:
			return 'Site is overloaded'; // Qualys
		case 530:
			return 'Site is frozen'; // Pantheon
		case 598:
			return 'Network Read Timeout Error'; // Informal convention
		case 599:
			return 'Network Connect Timeout Error'; // Informal convention

		default:
			// Categorize unknown codes
			if (code >= 100 && code < 200) return 'Informational Response';
			if (code >= 200 && code < 300) return 'Successful Response';
			if (code >= 300 && code < 400) return 'Redirection Message';
			if (code >= 400 && code < 500) return 'Client Error Response';
			if (code >= 500 && code < 600) return 'Server Error Response';
			return 'Unknown Status Code';
	}
}
