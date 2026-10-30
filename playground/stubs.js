//Provides: caml_unix_realpath
// The compiler only uses a canonical path to tell projects apart, so the path as given will do.
function caml_unix_realpath(path) { return path; }

//Provides: caml_hash_mix_string
//Requires: caml_hash_mix_jsbytes, caml_jsbytes_of_string, caml_hash_mix_int
// fckt's maps keep each key's hash, and some keys hold a whole file's text, so hashing all of a
// long string is slow here. A long string's hash covers its length and its two ends instead; equal
// strings still hash alike, which is all a hash needs.
function caml_hash_mix_string(h, v) {
  var s = caml_jsbytes_of_string(v);
  if (s.length <= 256) return caml_hash_mix_jsbytes(h, s);
  h = caml_hash_mix_int(h, s.length);
  h = caml_hash_mix_jsbytes(h, s.slice(0, 128));
  return caml_hash_mix_jsbytes(h, s.slice(s.length - 128));
}
