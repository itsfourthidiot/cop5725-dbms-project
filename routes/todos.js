var express = require('express');
var router = express.Router();
// Oracledb
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}


/* CREATE new todo */
async function insertNewTodo (req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection(config);
    todo = {
      id: {dir: oracledb.BIND_OUT},
      name: {val: req.body.name, dir: oracledb.BIND_INOUT},
      completed: {dir: oracledb.BIND_OUT},
    }
    result = await connection.execute(
      `INSERT INTO Todo(name) VALUES (:name)
      RETURNING id, name, completed INTO :id, :name, :completed`,
      todo,
      {
        autoCommit: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );
  } catch (err) {
    console.log('Ouch!', err)
  } finally {
    if (connection) {
      await connection.close();
      return res.send(result.outBinds);
    }
  }
}

router.post('/', function(req, res) {
  console.log("[INFO] /todos POST route...");
  insertNewTodo(req, res);
});


/* READ all todos */
async function readAllTodos (req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection(config);
    result = await connection.execute(
      `SELECT * FROM Todo`,
      [],
      {outFormat: oracledb.OUT_FORMAT_OBJECT}
    );
  } catch (err) {
    console.log('Ouch!', err)
    return res.send(err)
  } finally {
    if (connection) {
      await connection.close();
      return res.send(result.rows);
    }
  }
}

router.get('/', function(req, res) {
  console.log("[INFO] /todos GET route...");
  readAllTodos(req, res);
});



/* UPDATE existing todo*/
async function updateExistingTodo (req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection(config);
    todo = {
      id: {val: req.params.todoId, dir: oracledb.BIND_INOUT},
      name: {dir: oracledb.BIND_OUT},
      completed: {val: req.body.completed, dir: oracledb.BIND_INOUT},
    }
    result = await connection.execute(
      `UPDATE Todo SET completed=:completed WHERE id=:id
      RETURNING id, name, completed INTO :id, :name, :completed`,
      todo,
      {
        autoCommit: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );
  } catch (err) {
    console.log('Ouch!', err)
  } finally {
    if (connection) {
      await connection.close();
      return res.send(result.outBinds);
    }
  }
}

router.put('/:todoId', function(req, res) {
  console.log("[INFO] /todos/:todoId PUT route...");
  updateExistingTodo(req, res);
});


/* DELETE existing todo*/
async function deleteExistingTodo (req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection(config);
    todo = {
      id: {val: req.params.todoId, dir: oracledb.BIND_INOUT},
      name: {dir: oracledb.BIND_OUT},
      completed: {dir: oracledb.BIND_OUT},
    }
    result = await connection.execute(
      `DELETE FROM Todo WHERE id=:id
      RETURNING id, name, completed INTO :id, :name, :completed`,
      todo,
      {
        autoCommit: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );
  } catch (err) {
    console.log('Ouch!', err)
  } finally {
    if (connection) {
      await connection.close();
      return res.send(result.outBinds);
    }
  }
}

router.delete('/:todoId', function(req, res) {
  console.log("[INFO] /todos/:todoId DELETE route...");
  deleteExistingTodo(req, res);
});


module.exports = router;
