function ObjectModel(def, proto){
  var isCustomTest = isFunction(def);
  var Constructor;
  if(isCustomTest){
    Constructor = function (obj) {
      if (def(obj)) {
        return obj;
      }
      throw new TypeError("validity test " + objToString(def) + " failed for value " + objToString(obj));
    };
  } else {
    Constructor = function(obj) {
      if(!(this instanceof Constructor)){
        return new Constructor(obj);
      }
      merge(this, obj, true);
      var proxy = getProxy(this, def);
      validateModel(proxy, def);
      return proxy;
    };

    Constructor.extend = function(ext){
      return new ObjectModel(merge(ext || {}, def), Constructor.prototype);
    };
    Constructor.defaults = function(p){ Constructor.prototype = p; return this };
  }

  Constructor.toString = objToString.bind(this, def);
  Constructor.isValidModelFor = ObjectModel.isValidModelFor;
  Constructor.prototype = Object.create(proto || (isCustomTest ? Function.prototype : Object.prototype));
  Constructor.prototype.constructor = Constructor;
  Object.setPrototypeOf(Constructor, ObjectModel.prototype);
  return Constructor;
}
ObjectModel.prototype = Object.create(Function.prototype);
ObjectModel.isValidModelFor = function isValidModelFor(obj){
  try {
    new this(obj);
    return true;
  }
  catch(e){
    if(e instanceof TypeError){
      return false;
    }
    throw e;
  }
};

function isLeaf(def){
  return typeof def != "object" || Array.isArray(def) || def instanceof RegExp;
}

function getProxy(obj, def, path) {
  if(def instanceof FunctionModel){
    return def(obj);
  } else if(isLeaf(def)){
    matchDefinition(obj, def, path);
    return obj;
  } else {
    var wrapper = obj instanceof Object ? obj : Object.create(null);
    var proxy = Object.create(Object.getPrototypeOf(wrapper));
    Object.keys(def).forEach(function(key) {
      var newPath = (path ? [path,key].join('.') : key);
      var isWritable = (key.toUpperCase() != key);
      Object.defineProperty(proxy, key, {
        get: function () {
          return getProxy(wrapper[key], def[key], newPath);
        },
        set: function (val) {
          if(!isWritable && wrapper[key] !== undefined){
            throw new TypeError("cannot redefine constant "+key);
          }
          var newProxy = getProxy(val, def[key], newPath);
          if(!isLeaf(def[key])){
            validateModel(newProxy, def[key], newPath);
          }
          wrapper[key] = newProxy;
        },
        enumerable: (key[0] !== "_")
      });
    });
    return proxy;
  }
}

function validateModel(obj, def, path){
  if(isLeaf(def)){
    matchDefinition(obj, def, path);
  } else {
    Object.keys(def).forEach(function(key) {
      var newPath = (path ? [path,key].join('.') : key);
      validateModel(obj instanceof Object ? obj[key] : undefined, def[key], newPath);
    });
  }
}