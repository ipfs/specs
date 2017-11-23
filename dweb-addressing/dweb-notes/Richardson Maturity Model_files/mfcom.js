'use strict';

$(document).ready(function () {
  attachNavmenuEvents();
  attachTableofContentsEvents();
});

function attachNavmenuEvents() {
  // $('#top-navmenu').toggle(); //debugging toggle
  $('#bottom-navmenu').hide();
  $('#banner .navmenu-button').click(function (e) {
    e.preventDefault();
    $('#top-navmenu').toggle();
  });
  $('#footer .navmenu-button').click(function (e) {
    e.preventDefault();
    $('#bottom-navmenu').toggle();
    $('html, body').scrollTop($('#bottom-navmenu').offset().top);
  });
  $('.navmenu .close').click(function (e) {
    e.preventDefault();
    $(e.target).closest(".navmenu").parent().toggle();
  });
}

// Event listeners for Table of Contents
function attachTableofContentsEvents() {
  var bodyElement = createBody();
  var dropdownLinks = createDropdownLinks();
  var deviceView = createDeviceView(dropdownLinks, bodyElement);
  deviceView.init();
  attachPositioningTableOfContentsListener();
}

function attachPositioningTableOfContentsListener() {
  $(window).scroll(function () {
    var originalOffsetFromTop = $('#banner').height();
    if ($(window).scrollTop() <= originalOffsetFromTop) {
      toggleDropdownContainer(false);
    } else {
      toggleDropdownContainer(true);
    }
  });

  function toggleDropdownContainer(status) {
    $('.contents.dropdown-container').toggleClass('fixed-container', status);
  }
}

var createDeviceView = function createDeviceView(dropdownLinks, bodyElement) {
  function init() {
    attachStartingEvents();
    attachClosingEvents();
  }

  function attachStartingEvents() {
    dropdownLinks.hide();
    attachToggleDropdownLinksListener();
  }

  function attachToggleDropdownLinksListener() {
    $('.dropdown-button').click(function (e) {
      e.preventDefault();
      dropdownLinks.toggle();
      coordinateBodyScroll();
    });
  }

  function coordinateBodyScroll() {
    if (dropdownLinks.areVisible()) {
      bodyElement.disableScroll();
    } else {
      bodyElement.enableScroll();
    }
  }

  function clickOutOfDropdownContentListener() {
    $(document).click(function (e) {
      if (!$(e.target).closest('.contents.dropdown-container').length) {
        if (dropdownLinks.areVisible()) {
          dropdownLinks.hide();
          bodyElement.enableScroll();
        }
      }
    });
  };

  function clickFromLinksDropdownContentListener() {
    $('#dropdownLinks').children().click(function (e) {
      dropdownLinks.hide();
      if (!dropdownLinks.areVisible()) {
        bodyElement.enableScroll();
      }
    });
  };

  function attachClosingEvents() {
    clickOutOfDropdownContentListener();
    clickFromLinksDropdownContentListener();
  }

  return {
    init: init
  };
};

var createBody = function createBody() {
  var bodyElement = function bodyElement() {
    return $('body');
  };
  function disableBodyScroll() {
    bodyElement().toggleClass('no-scroll', true);
  }
  function enableBodyScroll() {
    bodyElement().toggleClass('no-scroll', false);
  }

  return {
    disableScroll: disableBodyScroll,
    enableScroll: enableBodyScroll
  };
};

var createDropdownLinks = function createDropdownLinks() {
  var dropdownLinks = function dropdownLinks() {
    return $('#dropdownLinks');
  };

  var dropdownLinksAreVisible = function dropdownLinksAreVisible() {
    return dropdownLinks().is(":visible");
  };

  function hide() {
    dropdownLinks().removeClass('dropdown-links');
  }

  function toggle() {
    dropdownLinks().toggleClass('dropdown-links');
  }

  return {
    hide: hide,
    toggle: toggle,
    areVisible: dropdownLinksAreVisible
  };
};

//# sourceMappingURL=mfcom.js.map