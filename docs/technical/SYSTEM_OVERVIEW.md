# ExCloth System Overview

## Why the project is structured this way

ExCloth has two very different users: customers and administrators.

A customer needs a shopping experience. An admin needs operational control over the store. Mixing both roles inside one navigation flow quickly becomes difficult to maintain and easy to misuse, so the application uses separate customer and admin navigators after authentication.

That separation improves the UI, but I do not treat navigation as a security boundary. Backend authorization still decides whether a privileged operation is allowed.

## High-Level Flow

```text
App Launch
   |
   v
Supabase Session Check
   |
   v
Authenticated?
   |
   +---- No ----> Auth Navigator
   |
   +---- Yes
           |
           v
     Admin Check
       |      |
       |      |
      No     Yes
       |      |
       v      v
Customer   Admin
Navigator Navigator