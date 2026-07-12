# Team Workspaces & Dashboards

## Phase 22: Collaborate and Manage Teams at Scale

### Overview

Complete workspace management system for teams:
- Workspace settings and naming
- Member invitation and management
- Role-based permissions (Owner, Editor, Viewer)
- Team activity tracking
- Shared resources and templates
- Member removal and role updates

### Workspace Concepts

#### Workspace
A shared team space containing:
- Design files
- Comments and feedback
- Versions and history
- Team members
- Shared resources

#### Members
Team members with assigned roles:
- **Owner** — Full control, manage team, delete workspace
- **Editor** — Create/edit files, comment, manage content
- **Viewer** — View-only, comment, export (read-only access)

### Key Features

#### Workspace Settings

**1. Workspace Identity**
- Name customization
- Workspace ID (unique identifier)
- Creation date tracking
- Invite link generation and sharing

**2. Member Management**
- Invite by email
- Assign roles (Editor/Viewer)
- Update existing member roles
- Remove members (except owner)
- View all members and roles

**3. Role-Based Permissions**

Owner Permissions:
- Create files
- Edit files
- Delete files
- Manage members (invite/remove)
- Change workspace name
- Delete workspace
- Full workspace control

Editor Permissions:
- Create files
- Edit files
- Delete files
- View members
- Comment on files
- Collaborate on designs

Viewer Permissions:
- View files (read-only)
- Comment on files
- Export files
- Provide feedback
- Limited to viewing existing content

**4. Team Management**
- Member list with roles
- Role selector for updates
- Quick member removal
- Email tracking for invitations

#### Dashboard Integration

**New "Workspace" Tab** in sidebar:
- Access workspace settings
- Manage team members
- Update roles
- Send invitations

### User Workflows

#### Setting Up a Team
1. Go to Workspace tab
2. Update workspace name
3. Click "Send Invite"
4. Enter team member emails
5. Assign roles (Editor/Viewer)
6. Members receive invitations

#### Managing Permissions
1. Open Workspace settings
2. Click member's role dropdown
3. Select new role (Editor/Viewer)
4. Changes apply immediately

#### Removing Team Members
1. Go to Workspace settings
2. Find member in list
3. Click trash icon
4. Confirm removal
5. Member loses access

#### Sharing Workspace
1. Copy workspace invite link
2. Share via email or chat
3. Recipients join with assigned role
4. Instant access to workspace

### Permission Model

#### File Operations by Role

| Operation | Owner | Editor | Viewer |
|-----------|-------|--------|--------|
| Create files | ✅ | ✅ | ❌ |
| Edit files | ✅ | ✅ | ❌ |
| Delete files | ✅ | ✅ | ❌ |
| View files | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| Export | ✅ | ✅ | ✅ |

#### Workspace Operations by Role

| Operation | Owner | Editor | Viewer |
|-----------|-------|--------|--------|
| Invite members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Rename workspace | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |
| View members | ✅ | ✅ | ✅ |

### UI Components

#### WorkspaceSettings Panel
- Workspace name editor
- Workspace ID display
- Invite form
- Members list
- Role management
- Danger zone

**Sections:**
1. Workspace Settings
   - Name input and save
   - ID display
   - Copy invite link
   - Creation date

2. Team Members
   - Member count
   - Invite form (email + role)
   - Members list with:
     - Name and email
     - Current role
     - Role selector
     - Remove button

3. Role Permissions
   - 3-column grid
   - Owner permissions
   - Editor permissions
   - Viewer permissions
   - Checkmark indicators

4. Danger Zone
   - Delete workspace button
   - Warning message
   - Irreversible action notice

### API Integration

#### Endpoints Used
- `GET /api/workspaces/[workspaceId]` — Workspace details
- `PATCH /api/workspaces/[workspaceId]` — Update name
- `GET /api/workspaces/[workspaceId]/members` — Member list
- `POST /api/workspaces/[workspaceId]/members` — Invite member
- `PATCH /api/workspaces/[workspaceId]/members/[memberId]` — Update role
- `DELETE /api/workspaces/[workspaceId]/members/[memberId]` — Remove member

### Example Scenarios

#### Scenario 1: Small Team Collaboration
```
Workspace: "Product Design Team"
Members:
- You (Owner)
- Sarah (Editor) - Lead Designer
- John (Viewer) - Product Manager
- Alex (Editor) - Designer

Workflow:
1. Create file for new feature
2. Sarah and Alex edit simultaneously
3. John reviews and comments
4. Everyone iterates
```

#### Scenario 2: Client Feedback
```
Workspace: "Client A Project"
Members:
- You (Owner)
- Designer (Editor) - Does the work
- Client (Viewer) - Reviews design
- Stakeholder (Viewer) - Provides input

Permissions:
- Designer can edit freely
- Clients can only view and comment
- Owner manages everything
```

### Security Considerations

#### Role Security
- Roles enforced on server-side
- Viewer cannot edit files
- Only owner can delete workspace
- Permission checks on all operations

#### Team Privacy
- Workspace data isolated
- Members only see own workspace
- No cross-workspace access
- Activity scoped to workspace

#### Audit Trail
- Member additions logged
- Role changes tracked
- Removals recorded
- Activity searchable

### Data Storage

#### Workspace Table
- id (PK)
- name (workspace name)
- ownerId (FK to User)
- createdAt
- updatedAt

#### WorkspaceMember Table
- id (PK)
- workspaceId (FK)
- userId (FK)
- userEmail
- userName
- role (owner/editor/viewer)
- createdAt

### Future Enhancements

#### Phase 23+
1. **Advanced Permissions**
   - Custom roles
   - Permission presets
   - Conditional access

2. **Team Features**
   - Team projects
   - Resource sharing
   - Billing and usage

3. **Audit & Compliance**
   - Audit logs
   - Export activity
   - Compliance reports

4. **Integration**
   - SAML/SSO
   - Directory sync
   - API for automation

5. **Workspace Hub**
   - Multiple workspaces
   - Workspace switching
   - Workspace templates

### Troubleshooting

**Member not receiving invite?**
- Check email address spelling
- Verify email in spam
- Resend invitation

**Can't change member role?**
- Verify you're owner
- Check member status
- Try refreshing page

**Workspace not showing changes?**
- Reload page
- Check user session
- Verify permissions

---

**Status:** Phase 22 ✅ Complete  
**Next:** Mobile responsiveness and final polish (Phase 23)
