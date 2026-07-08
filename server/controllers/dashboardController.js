import Website from '../models/Website.js';
import Scan from '../models/Scan.js';
import Vulnerability from '../models/Vulnerability.js';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

export const getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // websitesSummary and scoreHistory both need the base website list, so
    // this one has to resolve before the rest can run in parallel.
    const websites = await Website.find({ userId, isDeleted: false }).lean();

    const [
      totalWebsites,
      totalScans,
      openVulnerabilities,
      averageScoreAgg,
      scoreHistory,
      recentScans,
      riskDistributionAgg,
      openVulnCountsAgg,
    ] = await Promise.all([
      Website.countDocuments({ userId, isDeleted: false }),
      Scan.countDocuments({ userId, isDeleted: false, status: 'completed' }),
      Vulnerability.countDocuments({ userId, status: 'open', isDeleted: false }),
      Scan.aggregate([
        { $match: { userId, isDeleted: false, status: 'completed' } },
        { $sort: { websiteId: 1, createdAt: -1 } },
        { $group: { _id: '$websiteId', latestScore: { $first: '$score' } } },
        { $group: { _id: null, averageScore: { $avg: '$latestScore' } } },
      ]),
      Promise.all(
        websites.map(async (site) => {
          const scans = await Scan.find({ websiteId: site._id, status: 'completed', isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('score createdAt')
            .lean();

          return {
            websiteId: site._id,
            nickname: site.nickname,
            history: scans.reverse().map((s) => ({ date: s.createdAt, score: s.score })),
          };
        })
      ),
      Scan.find({ userId, status: 'completed', isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('websiteId', 'nickname domain')
        .select('websiteId score grade type createdAt completedAt')
        .lean(),
      Vulnerability.aggregate([
        { $match: { userId, status: 'open', isDeleted: false } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Vulnerability.aggregate([
        { $match: { userId, status: 'open', isDeleted: false } },
        { $group: { _id: '$websiteId', count: { $sum: 1 } } },
      ]),
    ]);

    const averageScore =
      averageScoreAgg[0]?.averageScore != null ? Math.round(averageScoreAgg[0].averageScore) : null;

    const riskDistribution = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
    for (const { _id, count } of riskDistributionAgg) {
      if (riskDistribution[_id] !== undefined) riskDistribution[_id] = count;
    }

    const openVulnMap = new Map(openVulnCountsAgg.map((v) => [v._id.toString(), v.count]));

    const websitesSummary = websites.map((site) => ({
      _id: site._id,
      nickname: site.nickname,
      domain: site.domain,
      lastScore: site.lastScore,
      lastGrade: site.lastGrade,
      lastScanAt: site.lastScanAt,
      openVulnCount: openVulnMap.get(site._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalWebsites,
        totalScans,
        openVulnerabilities,
        averageScore,
        websitesSummary,
        recentScans,
        riskDistribution,
        scoreHistory,
      },
    });
  } catch (err) {
    next(err);
  }
};
