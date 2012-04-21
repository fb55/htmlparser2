/***********************************************
Copyright 2010 - 2012, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/

(function () {

var exports;
if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
    exports = module.exports;
} else {
    exports = {};
    if (!this.Tautologistics) {
        this.Tautologistics = {};
    }
    if (!this.Tautologistics.NodeHtmlParser) {
        this.Tautologistics.NodeHtmlParser = {};
    }
    if (!this.Tautologistics.NodeHtmlParser.Tests) {
        this.Tautologistics.NodeHtmlParser.Tests = [];
    }
    this.Tautologistics.NodeHtmlParser.Tests.Rss = exports;
}

exports["RSS (2.0)"] = {
    options: {
          builder: {}
        , parser: {}
    },
    //http://cyber.law.harvard.edu/rss/examples/rss2sample.xml
    data: ['<?xml version="1.0"?>\
    <rss version="2.0">\
       <channel>\
          <title>Liftoff News</title>\
          <link>http://liftoff.msfc.nasa.gov/</link>\
          <description>Liftoff to Space Exploration.</description>\
          <language>en-us</language>\
          <pubDate>Tue, 10 Jun 2003 04:00:00 GMT</pubDate>\
\
          <lastBuildDate>Tue, 10 Jun 2003 09:41:01 GMT</lastBuildDate>\
          <docs>http://blogs.law.harvard.edu/tech/rss</docs>\
          <generator>Weblog Editor 2.0</generator>\
          <managingEditor>editor@example.com</managingEditor>\
          <webMaster>webmaster@example.com</webMaster>\
          <item>\
\
             <title>Star City</title>\
             <link>http://liftoff.msfc.nasa.gov/news/2003/news-starcity.asp</link>\
             <description>How do Americans get ready to work with Russians aboard the International Space Station? They take a crash course in culture, language and protocol at Russia\'s &lt;a href="http://howe.iki.rssi.ru/GCTC/gctc_e.htm"&gt;Star City&lt;/a&gt;.</description>\
             <pubDate>Tue, 03 Jun 2003 09:39:21 GMT</pubDate>\
             <guid>http://liftoff.msfc.nasa.gov/2003/06/03.html#item573</guid>\
\
          </item>\
          <item>\
             <description>Sky watchers in Europe, Asia, and parts of Alaska and Canada will experience a &lt;a href="http://science.nasa.gov/headlines/y2003/30may_solareclipse.htm"&gt;partial eclipse of the Sun&lt;/a&gt; on Saturday, May 31st.</description>\
             <pubDate>Fri, 30 May 2003 11:06:42 GMT</pubDate>\
             <guid>http://liftoff.msfc.nasa.gov/2003/05/30.html#item572</guid>\
\
          </item>\
          <item>\
             <title>The Engine That Does More</title>\
             <link>http://liftoff.msfc.nasa.gov/news/2003/news-VASIMR.asp</link>\
             <description>Before man travels to Mars, NASA hopes to design new engines that will let us fly through the Solar System more quickly.  The proposed VASIMR engine would do that.</description>\
             <pubDate>Tue, 27 May 2003 08:37:32 GMT</pubDate>\
             <guid>http://liftoff.msfc.nasa.gov/2003/05/27.html#item571</guid>\
\
          </item>\
          <item>\
             <title>Astronauts\' Dirty Laundry</title>\
             <link>http://liftoff.msfc.nasa.gov/news/2003/news-laundry.asp</link>\
             <description>Compared to earlier spacecraft, the International Space Station has many luxuries, but laundry facilities are not one of them.  Instead, astronauts have other options.</description>\
             <pubDate>Tue, 20 May 2003 08:56:02 GMT</pubDate>\
             <guid>http://liftoff.msfc.nasa.gov/2003/05/20.html#item570</guid>\
\
          </item>\
       </channel>\
    </rss>'],
    expected: {
          type: "rss"
        , id: ""
        , title: "Liftoff News"
        , link: "http://liftoff.msfc.nasa.gov/"
        , description: "Liftoff to Space Exploration."
        , updated: new Date("Tue, 10 Jun 2003 09:41:01 GMT")
        , author: "editor@example.com"
        , items: [
              {
                  id: "http://liftoff.msfc.nasa.gov/2003/06/03.html#item573"
                , title: "Star City"
                , link: "http://liftoff.msfc.nasa.gov/news/2003/news-starcity.asp"
                , description: "How do Americans get ready to work with Russians aboard the International Space Station? They take a crash course in culture, language and protocol at Russia's &lt;a href=\"http://howe.iki.rssi.ru/GCTC/gctc_e.htm\"&gt;Star City&lt;/a&gt;."
                , pubDate: new Date("Tue, 03 Jun 2003 09:39:21 GMT")
                }
            , {
                  id: "http://liftoff.msfc.nasa.gov/2003/05/30.html#item572"
                , description: "Sky watchers in Europe, Asia, and parts of Alaska and Canada will experience a &lt;a href=\"http://science.nasa.gov/headlines/y2003/30may_solareclipse.htm\"&gt;partial eclipse of the Sun&lt;/a&gt; on Saturday, May 31st."
                , pubDate: new Date("Fri, 30 May 2003 11:06:42 GMT")
                }
            , {
                  id: "http://liftoff.msfc.nasa.gov/2003/05/27.html#item571"
                , title: "The Engine That Does More"
                , link: "http://liftoff.msfc.nasa.gov/news/2003/news-VASIMR.asp"
                , description: "Before man travels to Mars, NASA hopes to design new engines that will let us fly through the Solar System more quickly.  The proposed VASIMR engine would do that."
                , pubDate: new Date("Tue, 27 May 2003 08:37:32 GMT")
                }
            , {
                 id: "http://liftoff.msfc.nasa.gov/2003/05/20.html#item570"
                , title: "Astronauts' Dirty Laundry"
                , link: "http://liftoff.msfc.nasa.gov/news/2003/news-laundry.asp"
                , description: "Compared to earlier spacecraft, the International Space Station has many luxuries, but laundry facilities are not one of them.  Instead, astronauts have other options."
                , pubDate: new Date("Tue, 20 May 2003 08:56:02 GMT")
                }
            ]
        }
    };

exports["Atom (1.0)"] =  {
    options: {
          builder: {}
        , parser: {}
    },
    //http://en.wikipedia.org/wiki/Atom_%28standard%29
    data: ['<?xml version="1.0" encoding="utf-8"?>\
\
    <feed xmlns="http://www.w3.org/2005/Atom">\
\
        <title>Example Feed</title>\
        <subtitle>A subtitle.</subtitle>\
        <link href="http://example.org/feed/" rel="self" />\
        <link href="http://example.org/" />\
        <id>urn:uuid:60a76c80-d399-11d9-b91C-0003939e0af6</id>\
        <updated>2003-12-13T18:30:02Z</updated>\
        <author>\
            <name>John Doe</name>\
            <email>johndoe@example.com</email>\
        </author>\
\
        <entry>\
            <title>Atom-Powered Robots Run Amok</title>\
            <link href="http://example.org/2003/12/13/atom03" />\
            <link rel="alternate" type="text/html" href="http://example.org/2003/12/13/atom03.html"/>\
            <link rel="edit" href="http://example.org/2003/12/13/atom03/edit"/>\
            <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>\
            <updated>2003-12-13T18:30:02Z</updated>\
            <summary>Some text.</summary>\
        </entry>\
\
    </feed>'],
    expected: {
          type: "atom"
        , id: "urn:uuid:60a76c80-d399-11d9-b91C-0003939e0af6"
        , title: "Example Feed"
        , link: "http://example.org/feed/"
        , description: "A subtitle."
        , updated: new Date("2003-12-13T18:30:02Z")
        , author: "johndoe@example.com"
        , items: [
              {
                  id: "urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a"
                , title: "Atom-Powered Robots Run Amok"
                , link: "http://example.org/2003/12/13/atom03"
                , description: "Some text."
                , pubDate: new Date("2003-12-13T18:30:02Z")
                }
            ]
        }
    };

})();
