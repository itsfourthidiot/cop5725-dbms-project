///////////////////////////
// Display all the todos //
///////////////////////////
function handleErrors(err){
    if(err.response){
        console.log(
            "Problem with the response",
            err.response.status
        );
    } else if(err.request){
        console.log("Problem with the request");
    } else{
        console.log("Error", err.message);
    }
}

function addTodo(todoData) {
    let newTodo = $('<li class="task">' + todoData.NAME + '<span>X</span></li>');
    newTodo.data('id', todoData.ID);
    newTodo.data('completed', todoData.COMPLETED);
    if(todoData.COMPLETED == '1') {
        newTodo.addClass('done')
    }
    $('.list').append(newTodo);
}

function addTodos(todosData) {
    todosData.forEach(todoData => {
        addTodo(todoData);
    });
}

function sendRequest(){
    axios.get("/todos")
    .then(function(res){
        addTodos(res.data);
    })
    .catch(handleErrors);
}

/////////////////////
// Insert new todo //
/////////////////////
function createTodo() {
    let userInput = $('#todoInput').val();
    axios.post('/todos', {
        "name": userInput
    })
    .then(function(res) {
        $('#todoInput').val('');
        let data = res.data;
        let numRows = data.id.length;
        for (let i = 0; i < numRows; i++) {
            let newTodo = {
                "ID": data.id[i],
                "NAME": data.name[i],
                "COMPLETED": data.completed[i]
            }
            addTodo(newTodo);
        }
    })
    .catch(handleErrors);
}

//////////////////////////
// Delete existing todo //
//////////////////////////
function removeTodo(todo) {
    let clickedId = todo.data('id');
    let deleteUrl = '/todos/' + clickedId;
    axios.delete(deleteUrl)
    .then(function(res) {
        todo.remove();
    })
    .catch(handleErrors);
}

//////////////////////////
// Update existing todo //
//////////////////////////
function updateTodo(todo) {
    let clickedId = todo.data('id');
    let updateUrl = '/todos/' + clickedId;
    let isDone = todo.data('completed');
    axios.put(updateUrl, {
        "completed": ((isDone == '1') ? 0 : 1)
    })
    .then(function(res) {
        todo.toggleClass('done');
    })
    .catch(handleErrors);
}

////////////////////
// Main execution //
////////////////////
$(document).ready(function(){
    sendRequest();
    
    $('#todoInput').keypress(function(event) {
        if(event.which == 13) {
            createTodo();
        }
    });

    $('.list').on('click', 'span', function(e){
        e.stopPropagation();
        removeTodo($(this).parent());
    });

    $('.list').on('click', 'li', function(){
        updateTodo($(this));
    });
});