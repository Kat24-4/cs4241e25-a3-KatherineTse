const login = async function (event) {
    event.preventDefault();

    const form = document.getElementById('login'),
        username = document.getElementById('username').value,
        password = document.getElementById('password').value,
        json = {username: username, password: password},
        body = JSON.stringify(json)

    const response = await fetch("/login", {
        method: 'POST',
        body
    })

    const result = await response.text()

    const message = JSON.parse(result);
    console.log(message)

    if (message === "success") {
        window.location.href="/app.html"
    } else if (message === "Creation Failure") {
        const parent = document.getElementById('message');
        const note = document.createElement('p');
        note.textContent = "Account creation failed! Please try again."
        parent.appendChild(note)
    } else if (message === "Incorrect password") {
        const parent = document.getElementById('message');
        const note = document.createElement('p');
        note.textContent = "Incorrect Password! Login Failed. Please try again."
        parent.appendChild(note)
    } else if (message === "Login Failed") {
        const parent = document.getElementById('message');
        const note = document.createElement('p');
        note.textContent = "Login failed! Please try again."
        parent.appendChild(note)
    }

    form.reset()
}

window.onload = function () {
    const loginSubmit = document.querySelector('#loginSubmit');
    loginSubmit.onclick = login;
}