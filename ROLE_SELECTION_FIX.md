# Role Selection Logic Fix - Documentation

## 🎯 Problem Statement

When a new user created an account and reached the "Select Your Role" screen, they would **always** receive an error:

```
"You do not have permission to switch roles. Your account is locked to sender mode."
```

This happened **even for brand new users** who had never selected a role before.

---

## 🔍 Root Cause

The backend `selectRole` function was checking role switching permissions **before** determining if this was a first-time role selection.

### Previous Flawed Logic:
```typescript
let isInitialSetup = false;

if (!userId && email && password) {
  // ... authenticate ...
  isInitialSetup = true;
}

if (isInitialSetup) {
  // Allow role selection
} else {
  // Check permissions - THIS RAN FOR NEW USERS!
  if (!existingUser.canSwitchRoles && existingUser.role !== 'both') {
    throw new AppError('You do not have permission to switch roles...');
  }
}
```

**Problem:** `isInitialSetup` was based on **authentication method** (email/password vs token), not whether the user had **ever set a role before**.

Result: New users with tokens would fail the permission check.

---

## ✅ Solution Implemented

### Fixed Logic:
```typescript
// CRITICAL: Check if this is the FIRST TIME the user is setting their role
const isFirstTimeRoleSelection = !existingUser.role || existingUser.role === '';

if (isFirstTimeRoleSelection) {
  // First time - allow ANY role choice
  const canSwitch = role === 'both';
  const initialActiveRole = role === 'both' ? 'sender' : role;
  
  await User.findByIdAndUpdate(userId, { 
    role, 
    activeRole: initialActiveRole,
    canSwitchRoles: canSwitch 
  });
  
  return; // Success!
}

// User already has a role - apply restrictions
if (!existingUser.canSwitchRoles && existingUser.role !== 'both') {
  throw new AppError('You do not have permission to switch roles...');
}
```

**Key Change:** Now checks if `existingUser.role` is `null`, `undefined`, or empty string to detect first-time users.

---

## 📊 Behavior Matrix

### Scenario 1: New User (First Time)
| User State | Action | Result |
|------------|--------|--------|
| `role: null` or `role: ""` | Selects "Sender" | ✅ Saved as `role: 'sender'`, `canSwitchRoles: false` |
| `role: null` or `role: ""` | Selects "Traveller" | ✅ Saved as `role: 'traveler'`, `canSwitchRoles: false` |
| `role: null` or `role: ""` | Selects "Dual Mode" | ✅ Saved as `role: 'both'`, `canSwitchRoles: true` |

**No permission errors shown!**

### Scenario 2: Existing User (Sender Locked)
| User State | Action | Result |
|------------|--------|--------|
| `role: 'sender'`, `canSwitchRoles: false` | Tries to switch to Traveller | ❌ Error: "Account locked to sender mode" |
| `role: 'sender'`, `canSwitchRoles: false` | Tries Dual Mode | ❌ Error: "Account locked to sender mode" |

### Scenario 3: Existing User (Traveller Locked)
| User State | Action | Result |
|------------|--------|--------|
| `role: 'traveler'`, `canSwitchRoles: false` | Tries to switch to Sender | ❌ Error: "Account locked to traveler mode" |
| `role: 'traveler'`, `canSwitchRoles: false` | Tries Dual Mode | ❌ Error: "Account locked to traveler mode" |

### Scenario 4: Existing User (Dual Mode)
| User State | Action | Result |
|------------|--------|--------|
| `role: 'both'`, `canSwitchRoles: true` | Switches to Sender | ✅ `activeRole: 'sender'` |
| `role: 'both'`, `canSwitchRoles: true` | Switches to Traveller | ✅ `activeRole: 'traveler'` |

---

## 🔧 Technical Implementation

### File Modified
**`server/src/controllers/auth.controller.ts`** - `selectRole` function

### Key Changes

#### 1. Detection Logic
**Before:**
```typescript
let isInitialSetup = false;
if (!userId && email && password) {
  isInitialSetup = true;
}
```

**After:**
```typescript
const isFirstTimeRoleSelection = !existingUser.role || existingUser.role === '';
```

#### 2. First-Time Path
```typescript
if (isFirstTimeRoleSelection) {
  // Allow any role selection
  const canSwitch = role === 'both';
  const initialActiveRole = role === 'both' ? 'sender' : role;
  
  const user = await User.findByIdAndUpdate(
    userId,
    { 
      role, 
      activeRole: initialActiveRole,
      canSwitchRoles: canSwitch 
    },
    { new: true }
  ).select('-password');
  
  res.json({ success: true, user });
  return; // Exit early - no permission checks
}
```

#### 3. Role Switching Path
```typescript
// Only reached if user already has a role
if (!existingUser.canSwitchRoles && existingUser.role !== 'both') {
  throw new AppError('You do not have permission to switch roles...');
}

// Allow switching activeRole between sender/traveler
const user = await User.findByIdAndUpdate(
  userId,
  { activeRole: role },
  { new: true }
);
```

---

## 🧪 Testing Scenarios

### Test 1: New User → Sender
```
1. Create account
2. Navigate to Select Role screen
3. Select "Sender"
4. Tap Continue
5. ✅ Role saved successfully
6. ✅ No permission error
7. ✅ Redirects to KYC screen
```

### Test 2: New User → Traveller
```
1. Create account
2. Navigate to Select Role screen
3. Select "Traveller"
4. Tap Continue
5. ✅ Role saved successfully
6. ✅ No permission error
7. ✅ Redirects to KYC screen
```

### Test 3: New User → Dual Mode
```
1. Create account
2. Navigate to Select Role screen
3. Select "Dual Mode"
4. Tap Continue
5. ✅ Role saved as 'both'
6. ✅ canSwitchRoles set to true
7. ✅ No permission error
8. ✅ Redirects to KYC screen
```

### Test 4: Existing Sender → Cannot Switch
```
1. Login as Sender (locked)
2. Try to switch to Traveller
3. ❌ Error: "Account locked to sender mode"
4. ✅ Role not changed
```

### Test 5: Existing Dual Mode → Can Switch
```
1. Login as Dual Mode user
2. Switch to Traveller
3. ✅ ActiveRole changed to 'traveler'
4. Switch to Sender
5. ✅ ActiveRole changed to 'sender'
6. ✅ No errors
```

---

## 📊 Database State Changes

### Before Role Selection (New User)
```json
{
  "_id": "user123",
  "email": "john@example.com",
  "username": "john",
  "fullName": "John Doe",
  "role": null,              // ← No role set
  "activeRole": null,
  "canSwitchRoles": false
}
```

### After Selecting "Sender"
```json
{
  "_id": "user123",
  "email": "john@example.com",
  "username": "john",
  "fullName": "John Doe",
  "role": "sender",          // ← Role set
  "activeRole": "sender",
  "canSwitchRoles": false    // ← Locked to sender
}
```

### After Selecting "Dual Mode"
```json
{
  "_id": "user123",
  "email": "john@example.com",
  "username": "john",
  "fullName": "John Doe",
  "role": "both",            // ← Dual mode
  "activeRole": "sender",    // ← Starts as sender
  "canSwitchRoles": true     // ← Can switch!
}
```

---

## 🎯 User Flow

### Registration → Role Selection Flow

```
User creates account
         ↓
Email verification
         ↓
Navigate to Select Role screen
         ↓
Backend checks: existingUser.role === null?
         ↓
    YES (First Time)
         ↓
Allow role selection freely
         ↓
Save chosen role to database
         ↓
Set canSwitchRoles based on choice
         ↓
Redirect to KYC screen
         ↓
✅ Success!
```

### Role Switching Flow (Existing User)

```
User tries to switch role
         ↓
Backend checks: existingUser.role === null?
         ↓
    NO (Already has role)
         ↓
Check: canSwitchRoles OR role === 'both'?
         ↓
    YES                    NO
     ↓                     ↓
Allow switch         Show error
     ↓                     ↓
Update activeRole    Don't change role
     ↓
✅ Success!
```

---

## ✅ Verification Checklist

- [x] New users can select Sender
- [x] New users can select Traveller
- [x] New users can select Dual Mode
- [x] No permission error for new users
- [x] Sender accounts cannot switch
- [x] Traveller accounts cannot switch
- [x] Dual Mode accounts can switch
- [x] Role saved correctly to database
- [x] canSwitchRoles flag set correctly
- [x] TypeScript compiles without errors
- [x] No breaking changes to other features

---

## 📁 Files Changed

### Modified:
1. **`server/src/controllers/auth.controller.ts`**
   - Updated `selectRole` function
   - Changed detection logic from `isInitialSetup` to `isFirstTimeRoleSelection`
   - Fixed permission check to run only for existing users

### No Changes:
- Frontend code (mobile app)
- User model schema
- Database migrations
- Other auth functions
- API routes

---

## 🚀 Deployment

### Steps:
1. ✅ Code updated in `auth.controller.ts`
2. ✅ TypeScript compilation: No errors
3. ✅ Logic tested with all scenarios
4. Ready to deploy

### Rollback (if needed):
Replace the `selectRole` function with the previous version. No database changes required.

---

## 💡 Why This Fix Works

### Problem with Old Logic:
- Used `isInitialSetup` based on **authentication method**
- Token-authenticated users were treated as "existing users"
- Permission check ran before role was set

### Solution:
- Check **database state** (`existingUser.role`)
- If role is null/empty → First time user
- Skip permission checks for first-time users
- Apply restrictions only after role exists

**Simple, reliable, correct!**

---

## 📞 Support

### Common Questions

**Q: What if a user's role is accidentally set to empty string?**
A: The fix handles this - `!existingUser.role || existingUser.role === ''` covers both cases.

**Q: Can users change their base role later?**
A: No. Once set, the base role (`sender`, `traveler`, or `both`) is permanent. Only `activeRole` can change for dual mode users.

**Q: What if I want to allow role changes later?**
A: You can add an admin endpoint to update the `role` field, but this should be a rare operation requiring verification.

---

## ✅ Success Criteria

| Requirement | Status |
|-------------|--------|
| New users can select role | ✅ Fixed |
| No permission error for new users | ✅ Fixed |
| Sender accounts locked | ✅ Working |
| Traveller accounts locked | ✅ Working |
| Dual mode can switch | ✅ Working |
| Database updated correctly | ✅ Working |
| No UI changes | ✅ Confirmed |
| TypeScript errors | ✅ Zero |
| Production-ready | ✅ Yes |

---

## 🎉 Conclusion

**The role selection bug is now fixed!**

New users can freely select their role during registration without encountering permission errors. Role restrictions are properly enforced only after the initial role is set.

**One line change, huge impact.** ✅
