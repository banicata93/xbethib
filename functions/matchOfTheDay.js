const MatchOfTheDay = require('../models/matchOfTheDay');

// Get active Match of the Day
async function getMatchOfTheDay(req, res) {
    try {
        // Find the most recent active match
        const match = await MatchOfTheDay.findOne({ isActive: true })
            .sort({ date: -1 })
            .lean();
        
        if (!match) {
            // Return default data if no match found
            return res.json({
                homeTeam: {
                    name: 'Home Team',
                    logo: '/images/default-team.png'
                },
                awayTeam: {
                    name: 'Away Team',
                    logo: '/images/default-team.png'
                },
                time: '20:00',
                prediction: 'Home Win',
                preview: 'This is a highly anticipated match between two top teams. Both sides are in excellent form and will be looking to secure all three points.'
            });
        }
        
        res.json({
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            time: match.time,
            prediction: match.prediction,
            preview: match.preview
        });
    } catch (error) {
        console.error('Error fetching Match of the Day:', error);
        res.status(500).json({ message: 'Error fetching match data' });
    }
}

// Create or update Match of the Day (Admin only)
async function setMatchOfTheDay(req, res) {
    try {
        const { homeTeam, awayTeam, time, prediction, preview } = req.body;
        
        // Validate required fields
        if (!homeTeam?.name || !awayTeam?.name || !time || !prediction || !preview) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Deactivate all previous matches
        await MatchOfTheDay.updateMany({}, { isActive: false });
        
        // Create new match
        const newMatch = new MatchOfTheDay({
            homeTeam: {
                name: homeTeam.name,
                logo: homeTeam.logo || '/images/default-team.png'
            },
            awayTeam: {
                name: awayTeam.name,
                logo: awayTeam.logo || '/images/default-team.png'
            },
            time,
            prediction,
            preview,
            isActive: true
        });
        
        await newMatch.save();
        
        res.json({
            success: true,
            message: 'Match of the Day updated successfully',
            match: newMatch
        });
    } catch (error) {
        console.error('Error setting Match of the Day:', error);
        res.status(500).json({ message: 'Error updating match data' });
    }
}

// Get all matches (Admin only)
async function getAllMatches(req, res) {
    try {
        const matches = await MatchOfTheDay.find()
            .sort({ date: -1 })
            .limit(50)
            .lean();
        
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ message: 'Error fetching matches' });
    }
}

// Delete a match (Admin only)
async function deleteMatch(req, res) {
    try {
        const { id } = req.params;
        
        await MatchOfTheDay.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Match deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({ message: 'Error deleting match' });
    }
}

module.exports = {
    getMatchOfTheDay,
    setMatchOfTheDay,
    getAllMatches,
    deleteMatch
};
