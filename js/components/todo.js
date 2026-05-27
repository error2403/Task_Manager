// Task list with localStorage persistence
const taskListElement = document.getElementById("taskList");

function getTasks() {
    try {
        return JSON.parse(localStorage.getItem('tasks') || '[]');
    } catch (e) {
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const tasks = getTasks();
    taskListElement.innerHTML = '';

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.textContent = task.text;
        if (task.checked) li.classList.add('checked');
        li.setAttribute('data-index', index);

        // toggle checked when clicking the list item
        li.addEventListener('click', function (ev) {
            if (ev.target.tagName === 'LI') {
                const idx = Number(li.getAttribute('data-index'));
                const current = getTasks();
                current[idx].checked = !current[idx].checked;
                saveTasks(current);
                renderTasks();
            }
        });

        // close/delete button
        const span = document.createElement('SPAN');
        span.className = 'close';
        span.textContent = '\u00D7';
        span.addEventListener('click', function (e) {
            e.stopPropagation();
            const idx = Number(li.getAttribute('data-index'));
            const current = getTasks();
            current.splice(idx, 1);
            saveTasks(current);
            renderTasks();
        });

        li.appendChild(span);
        taskListElement.appendChild(li);
    });
}

// initialize: if no tasks in storage, capture any existing DOM list items as defaults
function initializeTasks() {
    const tasks = getTasks();
    if (tasks.length === 0) {
        const domItems = Array.from(taskListElement.querySelectorAll('li'));
        if (domItems.length > 0) {
            const defaultTasks = domItems.map(li => ({
                text: li.textContent.replace('\u00D7', '').trim(),
                checked: li.classList.contains('checked')
            }));
            saveTasks(defaultTasks);
        }
    }
    renderTasks();
}

document.addEventListener('DOMContentLoaded', initializeTasks);

// Create a new list item when clicking on the "Add" button
function newTaskElement() {
    const input = document.getElementById('taskInput');
    const inputValue = input.value.trim();
    if (inputValue === '') {
        alert('You must write something!');
        return;
    }
    const tasks = getTasks();
    tasks.push({ text: inputValue, checked: false });
    saveTasks(tasks);
    input.value = '';
    renderTasks();
}