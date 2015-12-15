'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');
var ImageResourceFactory = require('./ImageResourceFactory');
var ThumbnailFactory = require('./ThumbnailFactory');

var CanvasObject = function(config) {
  var self = this;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.index = config.index;

  this.id = config.canvas['@id'];

  this.bounds = {
    x : config.x || 0,
    y : config.y || 0,
    height : config.canvas.height,
    width : config.canvas.width
  };

  this.label = config.canvas.label;
  this.viewingHint = config.canvas.viewingHint;

  this.dispatcher = config.dispatcher;
  this.viewer = config.viewer;
  this.images = [];

  if(config.canvas.images) {
    config.canvas.images.forEach(function(image) {
      self.images = self.images.concat(ImageResourceFactory(image, self));
    });
    this.dispatcher.emit('images-created', { 'detail': this.images });
  }

  this.thumbnail = ThumbnailFactory(config.canvas, self);
};

CanvasObject.prototype = {
  openTileSource: function(imageIndex) {
    this.dispatcher.emit('detail-tile-source-opened', { 'detail': this.id });
    var self = this;
    var image = this.images[imageIndex];

    var onTileDrawn = function(event) {
      if(event.detail.tileSource === image.tileSource) {
        self.dispatcher.removeListener('image-resource-tile-source-opened', onTileDrawn);
        image.fade(1);

        if(self.thumbnail){
          self.thumbnail.destroy();
          self.images.splice(self.images.indexOf(self.thumbnail), 1);
          delete self.thumbnail;
        }
      }
    };

    this.dispatcher.on('image-resource-tile-source-opened', onTileDrawn);
    image.openTileSource();
  },

  openMainTileSource: function() {
    this.openTileSource(0);
  },

  openThumbnail: function() {
    if(this.thumbnail) {
      this.thumbnail.openTileSource();
      this.images.push(this.thumbnail);
      this.dispatcher.emit('detail-thumbnail-opened', { 'detail': this.id });
    }
  },

  //Assumes that the point parameter is already in viewport coordinates.
  containsPoint: function(point) {
    var rectRight = this.bounds.x + this.bounds.width;
    var rectBottom = this.bounds.y + this.bounds.height;

    return (this.bounds.x <= point.x && rectRight >= point.x && this.bounds.y <= point.y && rectBottom >= point.y);
  },

  getVisibleImages: function() {
    return this.images.filter(function(image) { return image.visible === true; });
  },

  getDetailImages: function() {
    return this.images.filter(function(image) { return image.imageType === "detail" });
  },

  getAlternateImages: function() {
    return this.images.filter(function(image) { return image.imageType === "alternate" });
  },

  getMainImage: function() {
    return this.images.filter(function(image) {return image.imageType === "main" });
  },

  setBounds: function(x, y, width, height) {
    var self = this;
    this.bounds.x = x;
    this.bounds.y = y;
    this.bounds.width = width;
    this.bounds.height = height;

    this.images.forEach(function(image) {
      image.updateForParentChange(true);
    });
  },

  // Returns an OpenSeadragon Rect object - some OpenSeadragon consumers of this function want one,
  // and others can get x, y, width and height out easily.
  getBounds: function() {
    return new OpenSeadragon.Rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
  },

  getAspectRatio: function() {
    return this.bounds.width / this.bounds.height;
  },

  getOpacity: function() {
    return this.opacity;
  },

  setOpacity: function(opacity) {
    this.opacity = opacity;
    this.images.forEach(function(image) {
      image.updateOpacity();
    });
  }
};

module.exports = CanvasObject;
