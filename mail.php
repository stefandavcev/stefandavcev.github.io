<?php
// This portfolio is hosted on GitHub Pages, which does not execute PHP.
// The active contact form in contact.html uses FormSubmit and sends to stefandavcev@hotmail.com.
http_response_code(410);
header('Content-Type: application/json');
echo json_encode(['status' => 'inactive', 'message' => 'Use the contact form on contact.html.']);
