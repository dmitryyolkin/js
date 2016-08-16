=== Screens ===
1. Login (login, pass)
1.1 Forgot password -> specify e-mail -> change password (optional)

2. Admin
2.1 Users list (login, name, e-mail, roles)
2.2 Modify user (change password, e-mail)
2.3 Remove user

3. Keeper screen
3.1 Animals table (only keeper's animals or all)
3.2 Export (CSV/XML/JSON)

4. Zoologist screen
4.1 Animals table
4.2 Modify zoo
4.2.1 Specify a cage for animal (not more than 3 anumals per a cage)
4.2.2 Specify an order of keeper observation
4.3 Import (CSV/XML/JSON)

=== Data Models ===
1. User
id
name
surname
e-mail
login
password (MD5 hash)
[] UserRole

2. UserRole
ADMIN,
KEEPER,
ZOOLOGIST

3. Animal
name (unique id)
kind
age
User (keeper)
Cage

4. Cage
[] Animal

5. Schedule
User
[] Animal

6. Zoo
[] Animal
[] User
[] Schedule

