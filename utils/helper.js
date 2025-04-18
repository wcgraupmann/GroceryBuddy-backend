module.exports = {
        createToken: async (user, jwt, secret) => {
            return jwt.sign(
                {
                    user_id: user.user_id,
                    email: user.email,
                    name: user.name,
                },
                secret,
                { expiresIn: '1h', issuer: 'grocery-buddy' }
            );
        },
};