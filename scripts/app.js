angular.module('eccApp',[])

.controller('eccFormController', ['$scope', function($scope) {

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~v Necessary Vars v~~~~~~~~~~~~~~~~~~~~~~~~~~ */

  //commonly used 'big' numbers
  var b0 = new BN('0', 10);
  var b1 = new BN('1', 10);
  var b2 = new BN('2', 10);
  var b3 = new BN('3', 10);
  var b23 = new BN('23', 10);

  //data about example curve
  var c23 = {
    prime: b23,
    equation: 'y\u00b2 = x\u00b3 + x',
    a: b1,
    b: b0,
    generators: [
      [new BN('11', 10), new BN('13', 10)],
      [new BN('17', 10), new BN('13', 10)],
      [new BN('19', 10), new BN('22', 10)],
      [new BN('21', 10), new BN('17', 10)]
    ],
    pOnCurve: function(p) {
      var valid = true;
      //invalid x coordinate
      if(p[0].cmp(b0) < 0 || p[0].cmp(b23) >= 0 ) valid = false;
      //invalid y coordinate
      if(p[1].cmp(b0) < 0 || p[1].cmp(b23) >= 0 ) valid = false;
      //doesn't satisfy y^2=x^3+x
      if(p[1].pow(b2).umod(b23)
          .cmp( p[0].pow(b3).iadd(p[0]).umod(b23) ) !== 0) valid = false;
      if(!valid) console.log('point p: ' + p.toString() + ' is not on curve.');
      return valid;
    }
  };

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~v ECC op. functions v~~~~~~~~~~~~~~~~~~~~~~~~~ */

  // P + Q = R, where P != Q && P != -Q
  var addPoints = function(p, q) {
    var valid = true;
    if( p === Number.POSITIVE_INFINITY ) return q;
    if( !validP(p, c23) || !validP(q, c23) ) valid = false;
    if(p[0].cmp(q[0]) === 0 && p[1].cmp(q[1]) === 0) valid = false;
    if(p[0].cmp(q[0]) === 0 && q[1].cmp(p[1].neg().umod(c23.prime)) === 0) valid = false;
    if(!valid) {
      console.log('point p or q can\'t add. p:' + p + ' q:' + q);
      return valid;
    }

    var s = p[1].sub(q[1]).mul(p[0].sub(q[0]).invm(c23.prime)).umod(c23.prime);
    var xR = s.pow(b2).sub(p[0]).sub(q[0]).umod(c23.prime);
    var yR = s.mul(p[0].sub(xR)).sub(p[1]).umod(c23.prime);
    return [xR, yR];
  };

  // 2P = R
  var doubleP = function(p) {
    var valid = true;
    if( !validP(p, c23) || p[1].cmp(b0) === 0 ) valid = false;
    if( p === Number.POSITIVE_INFINITY ) valid = false;
    if(!valid) {
      console.log('point p can\'t be doubled. p:' + p);
      return valid;
    }

    //Double
    var s = p[0].pow(b2).mul(b3).add(c23.a).mul(p[1].mul(b2).invm(c23.prime)).umod(c23.prime);
    var xR = s.pow(b2).sub(p[0].mul(b2)).umod(c23.prime);
    var yR = s.mul(p[0].sub(xR)).sub(p[1]).umod(c23.prime);
    return [xR, yR];
  }

  // kP = R, 0 < k <= prime, P != '0'
  var scalarMult = function(p, k) {
    if( !validP(p, c23) || k.cmp(b0) < 1 || p === Number.POSITIVE_INFINITY ) {
      console.log('point p can\'t be multiplied by k. p:' + p + ' k:' + k.toString());
      return false;
    }

    var len = k.bitLength();
    var R = Number.POSITIVE_INFINITY;
    var N = [p[0].clone(), p[1].clone()];
    for(var bit = 0; bit < len; bit++) {
      if(k.testn(bit)) {
        R = addPoints(R, N);
      }
      N = doubleP(N);
    }
    return R;
  }

  // P is valid for usage && on curve
  var validP = function(p, c) {
    //Using Infinity as the '0 point' in ECC
    if( p === Number.POSITIVE_INFINITY ) return true;
    var valid;
    if( Object.prototype.toString.call(p) !== '[object Array]' ||
        p.length !== 2 ) {
      valid = false;
    } else {
     valid = c.pOnCurve(p);
    }
    if(!valid) console.log('point was not valid on curve. p:' + p.toString());
    return valid;
  };

/* ~~~~~~~~~~~~~~~~~~~~~~~~~v AngularJS gadgetry v~~~~~~~~~~~~~~~~~~~~~~~~~~ */

  //General usage vars
  $scope.curve = c23;
  $scope.genChoice = '0';

  //Point generation vars and functions
  $scope.cPoints = [];
  $scope.clearPoints = function() {
    $scope.cPoints = [];
  };
  $scope.genPoints = function() {
    var g = c23.generators[parseInt($scope.genChoice, 10)];
    $scope.cPoints = [];
    for(var i=1; i<=c23.prime; i++) {
      $scope.cPoints.push(scalarMult(g, new BN(i.toString(), 10)));
    }
  };

  //Key generation
  $scope.privateKey = '';
  $scope.publicKey = [NaN, NaN];

  $scope.genPubKey = function() {
    var pk = parseInt($scope.privateKey, 10);
    if(typeof pk === 'number' && isFinite(pk) && Math.floor(pk) === pk && pk > 0 && c23.prime.cmpn(pk) > 0) {
      var g = c23.generators[parseInt($scope.genChoice, 10)];
      $scope.publicKey = scalarMult(g, new BN($scope.privateKey, 10));
    }
  }

}]);
