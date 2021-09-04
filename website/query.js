const UPDATE_SERVER = '0.0.0.0:8001';
const FIRST_DELIM = '%';

// Source:
// https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function normalize(story_name) {
    const lower = story_name.toLowerCase().trim();
    const strict = lower.replace(/[\[\]&'"]+/g, '');

    return [lower, strict];
}

function hash(story_name) {
    // Trying to lower the amount of RAM used.
    // return '.db-general';
    return '.db-' + Math.abs(story_name.hashCode() % 100).toString();
}

function next_newline_pos(t, loc) {
    while (loc < t.length && t[loc] != '\n') loc++;
    return loc;
}

function bin_line_search(t, s, fp, lp) {
    if (fp > lp) return null;
    var attempt = Math.floor((fp - lp)/2);

    // Hunt for a newline.
    // I think we back up until a newline or the start of the file.
    while (attempt != 0 && t[attempt] != '\n') attempt--;
    // This clears out empty lines.
    // Is this jank? Maybe. Do I care? No.
    // The ' ' check should be pointless, so it could be removed later.
    while (t[attempt] == '\n' || t[attempt] == ' ') attempt++;

    // This was initially a separate function, but I folded it in here.
    // Makes things much easier because we have multiple outcomes.
    for (i = 0; i < s.length && (attempt + i) < t.length; i++)
    {
        // we are smaller; go earlier
        if (s[i] < t[attempt + i]) return bin_line_search(t, s, fp, next_newline_pos(t, attempt));
        // we are greater; go later
        if (s[i] > t[attempt + i]) return bin_line_search(t, s, next_newline_pos(t, attempt), lp);
    }

    // Our search string is longer; go later
    if (i != s.length - 1) return bin_line_search(t, s, next_newline_pos(t, attempt), lp);
    
    // Our search string is shorter; go earlier
    if (t[attempt + i + 1] != FIRST_DELIM) return bin_line_search(t, s, fp, next_newline_pos(t, attempt));

    // We matched. Return this line.
    return t.slice(attempt, next_newline_pos(t, attempt));
}

function handle_failure(unnormalized, loose, fn, outputhandler) {
    // Loose is 
    console.log(loose);
    console.log(fn);
}

function get_story(unnormalized, handler) {
    const [loose, strict] = normalize(unnormalized);
    var req = new XMLHttpRequest();
    req.onload = function() {
        if (this.readyState !== 4) return;
        if (this.status !== 200) return handle_failure(unnormalized, loose, hash(strict), handler);
        const t = this.responseText;
        if (t == null || t.length == 0) {
            attempt_story_load();
        }
        const search_query = loose;
        
        const ln = bin_line_search(t, search_query, 0, t.length); 
        console.log('Found it: ' + ln);
        handler(ln);

        // We should probably cache these. But, for now, we won't.
        
    };
    req.timeout = 2000;
    req.ontimeout = function (e) {
        handle_failure(unnormalized, loose, hash(strict), handler)
    };
    req.open('GET', hash(strict), true);
    req.send(null);
}

function query() {
    const value = document.getElementById('name').value;
    if (value == null || value.trim() == '') return;

    story_name = normalize(value);
    console.log(story_name);

    get_story(value, function (ln) {
        document.getElementById('output-value').value = ln;   
    });
}
