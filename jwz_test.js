var it = require('it-is');
var _ = require('underscore');
var mail = require('./jwz.js');

function isDummy(container) {
  return typeof(container.message) === "undefined";  
}

function childCount(idTable, id) {
  return idTable[id].children.length;
}

function childMessageId(idTable, id, childIndex) {
  var c = child(idTable, id, childIndex);
  return c.message.id;
}

function child(idTable, id, childIndex) {
  return idTable[id].children[childIndex];
}

//
// a
// +- b
//    +- c
//       +- d
//          +- e
// b
// +- c
//    +- d
//       +- e
// c
// +- d
//    +- e
// d
// +- e
// e
//
// create idTable for each message
var thread = mail.messageThread();
var idTable = thread.createIdTable([
  mail.message("subject", "a", ""),
  mail.message("subject", "b", "a"),
  mail.message("subject", "c", ["a", "b"]),
  mail.message("subject", "d", ["a", "b", "c"]),
  mail.message("subject", "e", "d")
]);
it(5).equal(_.keys(idTable).length)
it("b").equal(childMessageId(idTable, "a", 0))
it("c").equal(childMessageId(idTable, "b", 0))
it("d").equal(childMessageId(idTable, "c", 0))
it("e").equal(childMessageId(idTable, "d", 0))
it(0).equal(childCount(idTable, "e"))

//
// a
// +- b
//    +- c (dummy) 
//       +- d
//         +- e
// b
// +- c (dummy)
//    +- d
//       +- e
// c (dummy)
// +- e
//    +- e
// d
// +- e
// e:subject
//
// create idTable for each message and dummy containers in case of reference to non-existent message
var thread = mail.messageThread();
var idTable = thread.createIdTable([
  mail.message("subject", "a", ""),
  mail.message("subject", "b", "a"),
  mail.message("subject", "d", ["a", "b", "c"]),
  mail.message("subject", "e", "d")
]);
it(5).equal(_.keys(idTable).length)
it("b").equal(childMessageId(idTable, "a", 0))
it(true).equal(isDummy(idTable["c"]));
it("d").equal(childMessageId(idTable, "c", 0))
it("e").equal(childMessageId(idTable, "d", 0))
it(0).equal(childCount(idTable, "e"))

//
// a
// +- b
//    +- c (dummy)
//       +- d
//          +- e
// b 
// +- c
//    +- d
//       +- e
// y (dummy)
// c
// +- d
//    +- e
// z  (dummy)
// +- y (dummy)
// d
// +- e
// e
//
// should create idTable for each message and nested dummy containers in case of references to non-existent messages
var thread = mail.messageThread();
var idTable = thread.createIdTable([
  mail.message("subject", "a", ""),
  mail.message("subject", "b", "a"),
  mail.message("subject", "d", ["a", "b", "c"]),
  mail.message("subject", "e", ["z", "y", "d"])
]);
it(7).equal(_.keys(idTable).length)
it("b").equal(childMessageId(idTable, "a", 0))
it(true).equal(isDummy(idTable["c"]));
it("d").equal(childMessageId(idTable, "c", 0))
it(true).equal(isDummy(idTable["z"]));
it(true).equal(isDummy(idTable["y"]));
it(0).equal(childCount(idTable, "y"))
it("e").equal(childMessageId(idTable, "d", 0))
it(0).equal(childCount(idTable, "e"))

// 
// before: 
// a
// +- b
//   +- dummy 
//  
// after:
// a
// +- b
// 
// prune containers with empty message and no children
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
root.addChild(containerA);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a"]))
containerA.addChild(containerB);
var containerZ = mail.messageContainer();
containerB.addChild(containerZ);
thread.pruneEmpties(root);
it(containerA).equal(root.children[0]);
it(1).equal(containerA.children.length);
it(containerB).equal(containerA.children[0]);
it(0).equal(containerB.children.length);

// 
// before: 
// a
// +- b
//    +- z (dummy)
//       +- c
// 
// after:
// a
// +- b
//    +- c
// 
// prune containers with empty message and 1 non-empty child
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
root.addChild(containerA);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a"]))
containerA.addChild(containerB);
var containerC = mail.messageContainer(mail.message("subjectC", "c", ["a", "z"]))
var containerZ = mail.messageContainer();
containerB.addChild(containerZ);
containerZ.addChild(containerC);
thread.pruneEmpties(root);
it(1).equal(root.children.length);
it(containerA).equal(root.children[0]);
it(containerB).equal(containerA.children[0]);
it(containerC).equal(containerB.children[0]);

//
// before:
// a
// z (dummy)
// +- c
//
// after:
// a
// b
//
//
// promote child of containers with empty message and 1 child directly to root level
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
root.addChild(containerA);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["z"]))
var containerZ = mail.messageContainer();
root.addChild(containerZ);
containerZ.addChild(containerB);
thread.pruneEmpties(root);
it(2).equal(root.children.length);
it(containerA).equal(root.children[0]);
it(containerB).equal(root.children[1]);

//
// before:
// a
// z (dummy)
// +- b
// +- c
//
// after:
// a
// z (dummy)
// +- b
// +- c
//
// do *not* promote children of containers with empty message and 2 children directly to root level
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
root.addChild(containerA);
var containerZ = mail.messageContainer();
root.addChild(containerZ);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a", "z"]))
containerZ.addChild(containerB);
var containerC = mail.messageContainer(mail.message("subjectC", "c", ["a", "z"]))
containerZ.addChild(containerC);
thread.pruneEmpties(root);
it(2).equal(root.children.length);
it(containerA).equal(root.children[0]);
it(true).equal(isDummy(root.children[1]));
it(2).equal(containerZ.children.length);
it(containerB).equal(containerZ.children[0]);
it(containerC).equal(containerZ.children[1]);

//
// before:
// a
// z (dummy)
// +- y (dummy)
//    +- b
//    +- c
//    +- d
//
// after:
// a
// z (dummy)
// +- b 
// +- c
// +- d
//
// promote children of containers with empty message and 2 children directly to next level
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
root.addChild(containerA);
var containerZ = mail.messageContainer();
root.addChild(containerZ);
var containerY = mail.messageContainer();
containerZ.addChild(containerY);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a", "z"]))
containerY.addChild(containerB);
var containerC = mail.messageContainer(mail.message("subjectC", "c", ["a", "z"]))
containerY.addChild(containerC);
var containerD = mail.messageContainer(mail.message("subjectD", "d", ["a", "z"]))
containerY.addChild(containerD);
thread.pruneEmpties(root);
it(2).equal(root.children.length);
it(containerA).equal(root.children[0]);
it(true).equal(isDummy(root.children[1]));
it(3).equal(root.children[1].children.length);
it(containerD).equal(root.children[1].children[0]);
it(containerC).equal(root.children[1].children[1]);
it(containerB).equal(root.children[1].children[2]);

//
// before:
// a
// z (dummy)
// +- y (dummy)
//    +- x (dummy)
//       +- b
//       +- c
// +- d
//
// after:
// a
// z (dummy)
// +- b
// +- c
// +- d
//
// promote children of several containers with empty message and 2 children directly to next level
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
root.addChild(containerA);
var containerZ = mail.messageContainer();
root.addChild(containerZ);
var containerY = mail.messageContainer();
containerZ.addChild(containerY);
var containerX = mail.messageContainer();
containerY.addChild(containerX);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a", "z"]))
containerX.addChild(containerB);
var containerC = mail.messageContainer(mail.message("subjectC", "c", ["a", "z"]))
containerX.addChild(containerC);
var containerD = mail.messageContainer(mail.message("subjectD", "d", ["a", "z"]))
containerZ.addChild(containerD);
thread.pruneEmpties(root);
it(2).equal(root.children.length);
it(containerA).equal(root.children[0]);
it(true).equal(isDummy(root.children[1]));
it(3).equal(containerZ.children.length);
it(containerD).equal(containerZ.children[0]);
it(containerB).equal(containerZ.children[1]);
it(containerC).equal(containerZ.children[2]);

// 
// before:
// z (dummy)
// +- y (dummy)
//    +- a
// +- x (dummy)
// 
// after:
// a
// 
// promote children of several containers with empty message and multiple children
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerZ = mail.messageContainer();
root.addChild(containerZ);
var containerY = mail.messageContainer();
containerZ.addChild(containerY);
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
containerY.addChild(containerA);
var containerX = mail.messageContainer();
containerZ.addChild(containerX);
thread.pruneEmpties(root);
it(1).equal(root.children.length);
it(containerA).equal(root.children[0]);
it(0).equal(containerZ.children.length);

//
// before:
// z (dummy)
// +- y (dummy)
//    +- x (dummy)
//       +- w (dummy)
//          +- a
//             +- b
//          +- c
//             +- d
// +- v
//
// after:
// z (dummy)
// +- a
//    +- b
// +- c
//    +- d
//
// promote children of several containers with empty message and multiple children 2
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerZ = mail.messageContainer();
root.addChild(containerZ);
var containerY = mail.messageContainer();
containerZ.addChild(containerY);
var containerX = mail.messageContainer();
containerY.addChild(containerX);
var containerW = mail.messageContainer();
containerX.addChild(containerW);
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
containerW.addChild(containerA);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a", "z"]))
containerA.addChild(containerB);
var containerC = mail.messageContainer(mail.message("subjectC", "c", ["a", "z"]))
containerW.addChild(containerC);
var containerD = mail.messageContainer(mail.message("subjectD", "d", ["a", "z"]))
containerC.addChild(containerD);
var containerV = mail.messageContainer();
containerZ.addChild(containerV);
thread.pruneEmpties(root);
it(1).equal(root.children.length);
it(containerZ).equal(root.children[0]);
it(2).equal(containerZ.children.length);
it(containerC).equal(containerZ.children[0]);
it(containerA).equal(containerZ.children[1]);
it(containerB).equal(containerA.children[0]);
it(containerD).equal(containerC.children[0]);

//
// before:
// z (dummy)
// +- y (dummy)
//    +- x (dummy)
//       +- w (dummy)
//          +- a
//             +- b 
//          +- c   
//             +- d
//    +- v
//       +- u
//          +- t  
//             +- s
//                +- q  
//                   +- e
//          +- p
//             +- f
//
// after:
// z (dummy) 
// +- a
//    +- b
// +- c
//    +- d
// +- e
// +- f
//
// promote children of several containers with empty message and multiple children 3
var thread = mail.messageThread();
var root = mail.messageContainer();
var containerZ = mail.messageContainer();
root.addChild(containerZ);
var containerY = mail.messageContainer();
containerZ.addChild(containerY);
var containerX = mail.messageContainer();
containerY.addChild(containerX);
var containerW = mail.messageContainer();
containerX.addChild(containerW);
var containerA = mail.messageContainer(mail.message("subjectA", "a", []))
containerW.addChild(containerA);
var containerB = mail.messageContainer(mail.message("subjectB", "b", ["a", "z"]))
containerA.addChild(containerB);
var containerC = mail.messageContainer(mail.message("subjectC", "c", ["a", "z"]))
containerW.addChild(containerC);
var containerD = mail.messageContainer(mail.message("subjectD", "d", ["a", "z"]))
containerC.addChild(containerD);
var containerV = mail.messageContainer();
containerZ.addChild(containerV);
var containerU = mail.messageContainer();
containerV.addChild(containerU);
var containerT = mail.messageContainer();
containerU.addChild(containerT);
var containerS = mail.messageContainer();
containerT.addChild(containerS);
var containerQ = mail.messageContainer();
containerT.addChild(containerQ);
var containerE = mail.messageContainer(mail.message("subjectE", "e", []))
containerQ.addChild(containerE);
var containerP = mail.messageContainer();
containerU.addChild(containerP);
var containerF = mail.messageContainer(mail.message("subjectF", "f", []))
containerP.addChild(containerF);
thread.pruneEmpties(root);
it(1).equal(root.children.length);
it(containerZ).equal(root.children[0]);
it(4).equal(containerZ.children.length);
it(containerF).equal(containerZ.children[0]);
it(containerE).equal(containerZ.children[1]);
it(containerC).equal(containerZ.children[2]);
it(containerA).equal(containerZ.children[3]);
it(containerB).equal(containerA.children[0]);
it(containerD).equal(containerC.children[0]);