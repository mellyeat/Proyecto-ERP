# Standardizing Pug Layout

The user wants to standardize common UI elements (navbar, sidebar, HTML boilerplate) across different views into a master layout.

## Goals
- Create a reusable `layout.pug` file.
- Prevent code duplication across views.
- Make future updates to the navbar/sidebar easier.

## Proposed Changes

### UI Components Group

#### [NEW] layout.pug
- Will contain the `doctype html`, `head` with Bootstrap CSS links.
- Will contain the top `navbar`.
- Will contain the `sidebar` menu, using a variable `activePage` to highlight the current section.
- Will define `block content` for specific page content.
- Will define `block scripts` for page-specific JS.

#### [MODIFY] views/dashboard.pug
- Extend `layout.pug`.
- Set `activePage = 'dashboard'`.
- Remove repeated boilerplate and place existing dashboard metrics under `block content` and charts script under `block scripts`.

#### [MODIFY] views/empleados.pug
- Extend `layout.pug`.
- Set `activePage = 'empleados'`.
- Remove boilerplate, place specific form and table under `block content`.

#### [MODIFY] views/productos.pug
- Extend `layout.pug`.
- Set `activePage = 'productos'`.
- Remove boilerplate, place specific form and table under `block content`.

#### [MODIFY] views/ventas.pug
- Extend `layout.pug`.
- Set `activePage = 'ventas'`.
- Remove boilerplate, place specific form and table under `block content`.

#### [VIEW] views/index.pug
- Will check if index.pug is a login page. If it is, it might remain separate or use no layout, or use a simplified layout.

## Verification
- We'll build / review the [.pug](file:///c:/xampp/htdocs/Proyecto-ERP/views/index.pug) templates to ensure no broken syntax and that `block content` correctly encapsulates the specific view content.
