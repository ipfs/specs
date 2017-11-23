// Usage: assuming you have commit snapshots set up and building for your spec, include a link like
// `<a href="https://{my-spec}.spec.whatwg.org/commit-snapshots/{commit-sha}" id="commit-snapshot-link">Snapshot as of this commit</a>`.
//
// Then include this script with
// `<script src="https://resources.whatwg.org/commit-snapshot-shortcut-key.js" async></script>`.

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var keyCode = 'Y'.charCodeAt(0);
    var snapshotLink = document.querySelector('a#commit-snapshot-link');
    var snapshotUrl = snapshotLink.href;

    snapshotLink.title = 'You can also press the \'y\' key';
    window.addEventListener('keydown', function (e) {
      if (e.keyCode === keyCode) {
        location.href = snapshotUrl + location.hash;
      }
    });
  });
}());
