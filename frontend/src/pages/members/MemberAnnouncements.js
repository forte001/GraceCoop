import React, { useEffect, useState } from "react";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import Spinner from "../../components/Spinner";


const MemberAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState([]);

  const [readAnnouncements, setReadAnnouncements] = useState(() => {
  // get from local storage or initialize empty
  const stored = localStorage.getItem("readAnnouncements");
  return stored ? JSON.parse(stored) : [];
});


  const toggleExpand = (id) => {
  setExpandedIds((prev) =>
    prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
  );

  // also mark as read
  if (!readAnnouncements.includes(id)) {
    const updated = [...readAnnouncements, id];
    setReadAnnouncements(updated);
    localStorage.setItem("readAnnouncements", JSON.stringify(updated));
  }
};

  

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axiosMemberInstance.get("/members/notice/announcements/");
        setAnnouncements(res.data.results);
      } catch (err) {
        console.error("Error fetching announcements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  if (loading) return <Spinner />;

  return (
            <div className="member-announcements">
            <h2>Announcements</h2>
            <div className="announcement-list">
                {loading ? (
                <Spinner />
                ) : (
                <>
                    {announcements.filter((ann) => ann.is_active === true || ann.is_active === "true").length === 0 ? (
                    <p>No new update for now!</p>
                    ) : (
                    <ul>
                        {announcements
                        .filter((ann) => ann.is_active === true || ann.is_active === "true")
                        .slice(0, 10)
                        .map((ann, index) => {
                            const isExpanded = expandedIds.includes(ann.id);
                            const displayText =
                            isExpanded || ann.message.length <= 100
                                ? ann.message
                                : ann.message.slice(0, 100) + "...";
                            const showNewBadge = index === 0 && !readAnnouncements.includes(ann.id);
                            return (
                            <li key={ann.id} className="announcement-item">
                                <h4>
                                {ann.title}{" | "}
                                <span className="announcement-date">
                                    {new Date(ann.created_at).toLocaleDateString()}
                                </span>
                                {showNewBadge && <span className="new-badge">NEW</span>}
                                </h4>
                                <p>
                                {displayText}{" "}
                                {ann.message.length > 100 && (
                                    <button
                                    onClick={() => toggleExpand(ann.id)}
                                    className="read-more-button"
                                    >
                                    {isExpanded ? "Show less" : "Read more"}
                                    </button>
                                )}
                                </p>
                            </li>
                            );
                        })}
                    </ul>
                    )}
                </>
                )}
            </div>
</div>



  );
};

export default MemberAnnouncements;
