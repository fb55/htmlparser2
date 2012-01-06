exports.name = "RDF test";
exports.options = {
	handler: {},
	parser: {
		xmlMode: true
	}
};

exports.html = require("fs").readFileSync(__dirname+"/../Documents/RDF_Example.xml").toString();

exports.expected = {
  "type": "rdf:RDF",
  "id": "",
  "title": "craigslist | all community in SF bay area",
  "link": "http://sfbay.craigslist.org/ccc/",
  "items": [
    {
      "title": " Music Equipment Repair and Consignment ",
      "link": "\nhttp://sfbay.craigslist.org/sby/muc/2681301534.html\n",
      "description": "\nSan Jose Rock Shop offers musical instrument repair and consignment! (408) 215-2065"
    },
    {
      "title": "\nRide Offered - Oakland/BART to LA/SFV - TODAY 3PM 11/04 (oakland north / temescal)\n",
      "link": "\nhttp://sfbay.craigslist.org/eby/rid/2685010755.html\n",
      "description": "\nIm offering a lift for up to two people from Oakland (or near any BART station in the East Bay/580/880 Corridor, or San Jose/Morgan Hill, Gilroy) to the San Fernando Valley / Los Angeles area. Specifically, Im leaving from Oakland between 2:30 and 3:00pm (this is flexible, but if I leave too late my girlfriend will kill me), and heading to Woodland Hills via the 580, I-5, 405, and 101."
    }
  ]
};