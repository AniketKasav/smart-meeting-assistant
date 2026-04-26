# 🎯 **Complete Permission Structure Guide**

Based on your UI, here's the comprehensive access control:

---

## 📊 **1. DASHBOARD**

| Feature | Host | Member |
|---------|------|--------|
| View total meetings | ✅ Own meetings | ✅ Participated meetings |
| Meeting stats cards | ✅ All stats | ✅ Only participated |
| Create new meeting | ✅ Yes | ✅ Yes (becomes host) |
| Search meetings | ✅ All owned | ✅ Only participated |
| Daily briefing | ✅ Own schedule | ✅ Participated schedule |

---

## 📋 **2. MEETING CARDS** (Image 2)

| Feature | Host | Member |
|---------|------|--------|
| "Join Meeting" button | ✅ Show if in-progress | ✅ Show if in-progress |
| "View Details" button | ✅ Always show | ✅ Always show |
| Delete button (trash icon) | ✅ Show | ❌ Hide |
| Edit meeting title | ✅ Yes | ❌ No |

---

## 🎥 **3. MEETING DETAIL PAGE** (Image 3)

| Action | Host | Member | Notes |
|--------|------|--------|-------|
| **Join Video Call** | ❌ Hide if completed | ❌ Hide if completed | Show only for in-progress |
| **Export** | ✅ All formats | ✅ Transcript only | Members can export transcript |
| **Share** | ✅ Yes | ❌ No | Only host can share |
| **Download** | ✅ Yes | ✅ Transcript only | Members get text only |
| **ID Speakers** | ✅ Yes | ❌ No | Expensive operation |
| **Delete** | ✅ Yes | ❌ No | Only host can delete |
| **Edit Title** | ✅ Yes | ❌ No | Only host can edit |
| **Generate Summary** | ✅ Yes | ❌ No | Only host triggers AI |
| **Regenerate Summary** | ✅ Yes | ❌ No | Only host |
| **Delete Summary** | ✅ Yes | ❌ No | Only host |
| **View Summary** | ✅ Yes | ✅ Yes | All can view |
| **View Transcript** | ✅ Yes | ✅ Yes | All can view |
| **View Recording** | ✅ Yes | ✅ Yes | All can play audio |
| **Speaker Analytics** | ✅ Yes | ✅ Yes | All can view |

---

## 📈 **4. PERFORMANCE ANALYTICS** (Image 4)

### **A. GLOBAL STATS (Visible to ALL)**

| Metric | Host | Member |
|--------|------|--------|
| Total Meetings Count | ✅ Own meetings | ✅ Participated |
| Total Duration | ✅ Own meetings total | ✅ Participated total |
| Meeting Activity Chart | ✅ Own activity | ✅ Participated activity |
| Overall Completion Rate | ✅ Own meetings | ✅ Participated |

### **B. INDIVIDUAL PERFORMANCE (PRIVATE)**

**Each member sees ONLY their own:**
- ✅ Personal talk time in meetings
- ✅ Personal participation rate
- ✅ Personal sentiment score
- ✅ Personal action item completion

**Host sees:**
- ✅ All participants' individual stats
- ✅ Comparative analytics
- ✅ Team performance overview

### **C. FILTER BY PARTICIPANT**

| Feature | Host | Member |
|---------|------|--------|
| "All Participants" option | ✅ Can select any | ❌ Only sees "My Performance" |
| Individual stats | ✅ Can view anyone | ❌ Only own stats |

---

## ✅ **5. ACTION ITEMS** (Image 5)

| Action | Host | Member |
|--------|------|--------|
| View all action items | ✅ From own meetings | ✅ Only assigned to them |
| Create action item | ✅ Yes | ❌ No |
| Assign to others | ✅ Yes | ❌ No |
| Update status (own) | ✅ Yes | ✅ Yes (if assigned) |
| Update status (others) | ✅ Yes | ❌ No |
| Delete action item | ✅ Yes | ❌ No |
| Filter by assignee | ✅ All assignees | ✅ Only self |

---

## 🔍 **6. SEARCH** (Image 6)

| Feature | Host | Member |
|---------|------|--------|
| Search own meetings | ✅ Yes | ✅ Yes |
| Advanced filters | ✅ All meetings | ✅ Participated only |
| Sentiment filter | ✅ All | ✅ Participated |
| Participant filter | ✅ Any participant | ✅ Self + others in same meeting |

---

## 🎯 **RECOMMENDED IMPLEMENTATION**

### **Performance Analytics - BEST PRACTICE:**

**Option A: Privacy-First (RECOMMENDED)** ⭐
- Each member sees **ONLY their own individual metrics**
- Host sees **everyone's metrics + team comparisons**
- Global meeting stats (count, duration) visible to all

**Option B: Transparent Team**
- All participants see everyone's stats
- Good for small, trusted teams
- May cause pressure/comparison issues

**Option C: Hybrid**
- Basic stats visible to all (talk time %)
- Detailed analytics (sentiment, engagement) private
- Host sees everything

---

## 🛠️ **IMPLEMENTATION SUMMARY**

### **Files to Modify:**

1. **`backend/models/Meeting.js`**
   - Add `host` field
   - Add `createdBy` reference

2. **`frontend/src/pages/MeetingDetail.jsx`**
   - Add role check: `const isHost = meeting.host?.userId === currentUser.userId`
   - Conditionally render buttons

3. **`frontend/src/pages/Performance.jsx`**
   - Filter analytics by user role
   - Show only personal stats for members

4. **`frontend/src/pages/ActionItems.jsx`**
   - Filter: host sees all, members see assigned

5. **`frontend/src/components/MeetingCard.jsx`**
   - Hide delete button for non-hosts

---

## 🎯 **MY RECOMMENDATIONS:**

✅ **Members can:**
- View & play recordings
- Download transcripts
- See summaries
- View their own performance
- Update their assigned action items

❌ **Members cannot:**
- Delete/edit meetings
- Generate AI summaries (expensive)
- Run diarization (expensive)
- Share meetings
- Assign tasks to others
- View others' private stats

✅ **Performance Analytics:**
- **Use Option A (Privacy-First)** for professional teams
- Members see only their own detailed stats
- Host sees team overview + individual breakdowns

---

## 📋 **QUICK ANSWERS:**

**Q: Members can export?**
✅ **YES** - Transcript only (text)

**Q: Members can download?**
✅ **YES** - Transcript only (text)

**Q: Members can share?**
❌ **NO** - Only host

**Q: Performance visible to all?**
❌ **NO** - Private (Option A recommended)
- **Global stats**: Yes (meeting count, total duration)
- **Individual metrics**: No (only own + host)

---

**Ready to implement? Reply:**
- **"Implement Privacy-First"** (Option A - recommended)
- **"Implement Transparent"** (Option B)
- **"Implement Hybrid"** (Option C)

I'll create all the code! 🚀