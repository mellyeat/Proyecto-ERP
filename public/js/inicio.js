function login(event) {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;

    fetch('/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ usuario, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = "/dashboard";
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    })
    .catch(err => {
        console.error(err);
        alert("Error en el servidor");
    });
}